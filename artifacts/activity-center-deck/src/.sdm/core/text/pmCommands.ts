import { Value } from '@sinclair/typebox/value';
import { splitBlockKeepMarks } from 'prosemirror-commands';
import type {
  Mark,
  MarkType,
  Node as ProseMirrorNode,
} from 'prosemirror-model';
import type { Command, EditorState, Transaction } from 'prosemirror-state';

import {
  RunStyleSchema,
  type Bullet,
  type Paragraph,
  type RunStyle,
} from '../schema';
import { marksFromRunStyle, runStyleFromMarks } from './pmDoc';
import { sdmTextSchema } from './pmSchema';

const runStyleKeys: Array<keyof RunStyle> = [
  'font',
  'sizePt',
  'weight',
  'italic',
  'underline',
  'strike',
  'color',
  'highlight',
  'letterSpacingPt',
];

interface ParagraphTarget {
  index: number;
  node: ProseMirrorNode;
  position: number;
}

type ParagraphAttrsUpdate = (
  attrs: Record<string, unknown>,
  index: number,
) => Record<string, unknown>;

function paragraphTargets(state: EditorState): Array<ParagraphTarget> {
  if (state.selection.empty) {
    const index = state.selection.$from.index(0);
    const node = state.doc.child(index);
    if (node.type !== sdmTextSchema.nodes.paragraph) {
      return [];
    }
    let position = 0;
    for (let childIndex = 0; childIndex < index; childIndex += 1) {
      position += state.doc.child(childIndex).nodeSize;
    }

    return [{ index, node, position }];
  }

  const targets: Array<ParagraphTarget> = [];
  state.doc.forEach((node, position, index) => {
    const end = position + node.nodeSize;
    if (
      node.type === sdmTextSchema.nodes.paragraph &&
      state.selection.from < end &&
      state.selection.to > position
    ) {
      targets.push({ index, node, position });
    }
  });

  return targets;
}

function updateParagraphAttrs(update: ParagraphAttrsUpdate): Command {
  return (state, dispatch) => {
    const targets = paragraphTargets(state);
    if (targets.length === 0) {
      return false;
    }
    if (dispatch === undefined) {
      return true;
    }
    const transaction = state.tr;
    let changed = false;
    targets.forEach((target, index) => {
      const attrs: Record<string, unknown> = target.node.attrs;
      const next = update(attrs, index);
      if (JSON.stringify(next) === JSON.stringify(attrs)) {
        return;
      }
      transaction.setNodeMarkup(target.position, undefined, next);
      changed = true;
    });
    if (changed) {
      dispatch(transaction);
    }

    return true;
  };
}

export function setParagraphAlignment(align: Paragraph['align']): Command {
  return updateParagraphAttrs((attrs) => ({ ...attrs, align: align ?? null }));
}

export function setParagraphSpacing(
  values: Partial<
    Pick<Paragraph, 'lineHeight' | 'spaceAfterPt' | 'spaceBeforePt'>
  >,
): Command {
  return updateParagraphAttrs((attrs) => {
    const next = { ...attrs };
    if (Object.hasOwn(values, 'lineHeight')) {
      next.lineHeight = values.lineHeight ?? null;
    }
    if (Object.hasOwn(values, 'spaceAfterPt')) {
      next.spaceAfterPt = values.spaceAfterPt ?? null;
    }
    if (Object.hasOwn(values, 'spaceBeforePt')) {
      next.spaceBeforePt = values.spaceBeforePt ?? null;
    }

    return next;
  });
}

function shiftParagraphLevel(delta: number): Command {
  return updateParagraphAttrs((attrs) => {
    const current =
      typeof attrs.level === 'number' && Number.isInteger(attrs.level)
        ? attrs.level
        : 0;
    const level = Math.max(0, Math.min(8, current + delta));

    return { ...attrs, level: level === 0 ? null : level };
  });
}

export const indentParagraphs = shiftParagraphLevel(1);
export const outdentParagraphs = shiftParagraphLevel(-1);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Google Slides Backspace ladder for the start of a paragraph: the first
 * press clears the bullet, later presses walk the indent back, and only a
 * bare paragraph falls through to the default join behavior.
 */
export const backspaceParagraphFormatting: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if (!state.selection.empty || $from.parentOffset !== 0) {
    return false;
  }
  const parent = $from.parent;
  if (parent.type !== sdmTextSchema.nodes.paragraph) {
    return false;
  }
  const attrs: Record<string, unknown> = parent.attrs;
  const hasBullet =
    isRecord(attrs.bullet) &&
    (attrs.bullet.kind === 'character' || attrs.bullet.kind === 'number');
  const level =
    typeof attrs.level === 'number' &&
    Number.isInteger(attrs.level) &&
    attrs.level > 0
      ? attrs.level
      : 0;
  if (!hasBullet && level === 0) {
    return false;
  }
  if (dispatch !== undefined) {
    const next = hasBullet
      ? { ...attrs, bullet: null }
      : { ...attrs, level: level > 1 ? level - 1 : null };
    dispatch(state.tr.setNodeMarkup($from.before(), undefined, next));
  }

  return true;
};

export type SdmBulletUpdate =
  | { kind: 'character'; character: string }
  | { kind: 'number'; style?: string; startAt?: number | null };

/**
 * Replaces the bullet of every selected paragraph. Number updates preserve
 * each paragraph's existing restart unless the update carries `startAt`
 * (`null` clears it); explicit restarts only ever land on the first selected
 * paragraph, matching {@link toggleNumberedBullets}.
 */
export function setBulletProperties(update: SdmBulletUpdate): Command {
  return updateParagraphAttrs((attrs, index) => {
    if (update.kind === 'character') {
      return {
        ...attrs,
        bullet: { kind: 'character', character: update.character },
      };
    }
    const current =
      isRecord(attrs.bullet) && attrs.bullet.kind === 'number'
        ? attrs.bullet
        : undefined;
    const style =
      update.style ??
      (typeof current?.style === 'string' ? current.style : undefined);
    const currentStartAt =
      typeof current?.startAt === 'number' ? current.startAt : undefined;
    const startAt =
      index === 0 && update.startAt !== undefined
        ? (update.startAt ?? undefined)
        : currentStartAt;

    return {
      ...attrs,
      bullet: {
        kind: 'number',
        ...(style === undefined ? {} : { style }),
        ...(startAt === undefined ? {} : { startAt }),
      },
    };
  });
}

function toggleBullets(
  kind: 'character' | 'number',
  create: (index: number) => Bullet,
): Command {
  return (state, dispatch) => {
    const targets = paragraphTargets(state);
    if (targets.length === 0) {
      return false;
    }
    const allActive = targets.every(
      ({ node }) =>
        typeof node.attrs.bullet === 'object' &&
        node.attrs.bullet !== null &&
        node.attrs.bullet.kind === kind,
    );
    if (dispatch === undefined) {
      return true;
    }
    const transaction = state.tr;
    targets.forEach((target, index) => {
      transaction.setNodeMarkup(target.position, undefined, {
        ...target.node.attrs,
        bullet: allActive ? null : create(index),
        ...(allActive ? { level: null } : {}),
      });
    });
    dispatch(transaction);

    return true;
  };
}

export function toggleCharacterBullets(character = '•'): Command {
  return toggleBullets('character', () => ({ kind: 'character', character }));
}

export function toggleNumberedBullets({
  startAt,
  style,
}: {
  startAt?: number;
  style?: string;
} = {}): Command {
  return toggleBullets('number', (index) => ({
    kind: 'number',
    ...(style === undefined ? {} : { style }),
    ...(index === 0 && startAt !== undefined ? { startAt } : {}),
  }));
}

function markTypeForStyle(key: keyof RunStyle): MarkType {
  switch (key) {
    case 'font':
      return sdmTextSchema.marks.font;
    case 'sizePt':
      return sdmTextSchema.marks.sizePt;
    case 'weight':
      return sdmTextSchema.marks.weight;
    case 'italic':
      return sdmTextSchema.marks.italic;
    case 'underline':
      return sdmTextSchema.marks.underline;
    case 'strike':
      return sdmTextSchema.marks.strike;
    case 'color':
      return sdmTextSchema.marks.color;
    case 'highlight':
      return sdmTextSchema.marks.highlight;
    case 'letterSpacingPt':
      return sdmTextSchema.marks.letterSpacingPt;
  }
}

function markForStyle(
  key: keyof RunStyle,
  value: RunStyle[keyof RunStyle],
): Mark | undefined {
  if (value === undefined) {
    return undefined;
  }
  const type = markTypeForStyle(key);
  if (key === 'italic' || key === 'underline' || key === 'strike') {
    return type.create({ enabled: value });
  }
  if (key === 'highlight') {
    return type.create({ color: value });
  }

  return type.create({ [key]: value });
}

function updateStoredMark(
  marks: ReadonlyArray<Mark>,
  key: keyof RunStyle,
  value: RunStyle[keyof RunStyle],
): ReadonlyArray<Mark> {
  const type = markTypeForStyle(key);
  let next = type.removeFromSet([...marks]);
  const mark = markForStyle(key, value);
  if (mark !== undefined) {
    next = mark.addToSet(next);
  }

  return next;
}

export function setRunStyle(values: Partial<RunStyle>): Command {
  return (state, dispatch) => {
    if (dispatch === undefined) {
      return true;
    }
    const transaction = state.tr;
    const entries: Array<[keyof RunStyle, RunStyle[keyof RunStyle]]> = [];
    for (const key of runStyleKeys) {
      if (Object.hasOwn(values, key)) {
        entries.push([key, values[key]]);
      }
    }
    if (state.selection.empty) {
      const parent = state.selection.$from.parent;
      let marks = state.storedMarks ?? state.selection.$from.marks().slice();
      if (
        parent.type === sdmTextSchema.nodes.paragraph &&
        parent.content.size === 0 &&
        Value.Check(RunStyleSchema, parent.attrs.defaultRunStyle)
      ) {
        marks = marksFromRunStyle({
          ...parent.attrs.defaultRunStyle,
          ...runStyleFromMarks(marks),
        });
      }
      for (const [key, value] of entries) {
        marks = updateStoredMark(marks, key, value);
      }
      transaction.setStoredMarks(marks);
      if (
        parent.type === sdmTextSchema.nodes.paragraph &&
        parent.content.size === 0
      ) {
        const defaultRunStyle = runStyleFromMarks(marks);
        const hasStyle = Object.keys(defaultRunStyle).length > 0;
        transaction.setNodeMarkup(state.selection.$from.before(), undefined, {
          ...parent.attrs,
          defaultRunStyle: hasStyle ? defaultRunStyle : null,
          // Serialization drops synthetic empty paragraphs, which would
          // discard the style just persisted for an empty text body.
          ...(hasStyle ? { synthetic: false } : {}),
        });
      }
    } else {
      for (const [key, value] of entries) {
        const type = markTypeForStyle(key);
        transaction.removeMark(state.selection.from, state.selection.to, type);
        const mark = markForStyle(key, value);
        if (mark !== undefined) {
          transaction.addMark(state.selection.from, state.selection.to, mark);
        }
      }
    }
    dispatch(transaction);

    return true;
  };
}

function continuedBullet(value: unknown): unknown {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('kind' in value) ||
    value.kind !== 'number'
  ) {
    return value;
  }
  const style =
    'style' in value && typeof value.style === 'string'
      ? value.style
      : undefined;

  return { kind: 'number', ...(style === undefined ? {} : { style }) };
}

function withInheritedParagraphAttrs(
  transaction: Transaction,
  sourceAttrs: Record<string, unknown>,
  defaultRunStyle: RunStyle,
): Transaction {
  const target = transaction.selection.$from.parent;
  if (target.type !== sdmTextSchema.nodes.paragraph) {
    return transaction;
  }
  transaction.setNodeMarkup(transaction.selection.$from.before(), undefined, {
    ...target.attrs,
    ...sourceAttrs,
    bullet: continuedBullet(sourceAttrs.bullet),
    defaultRunStyle:
      Object.keys(defaultRunStyle).length === 0
        ? sourceAttrs.defaultRunStyle
        : defaultRunStyle,
    synthetic: false,
  });

  return transaction;
}

export const splitSdmParagraph: Command = (state, dispatch, view) => {
  const parent = state.selection.$from.parent;
  if (parent.type !== sdmTextSchema.nodes.paragraph) {
    return false;
  }
  const sourceAttrs: Record<string, unknown> = parent.attrs;
  const bullet = sourceAttrs.bullet;
  if (
    state.selection.empty &&
    parent.content.size === 0 &&
    isRecord(bullet) &&
    (bullet.kind === 'character' || bullet.kind === 'number')
  ) {
    if (dispatch !== undefined) {
      dispatch(
        state.tr.setNodeMarkup(state.selection.$from.before(), undefined, {
          ...sourceAttrs,
          bullet: null,
          level: null,
        }),
      );
    }

    return true;
  }
  const marks = state.storedMarks ?? state.selection.$from.marks();
  const sourceDefault = Value.Check(RunStyleSchema, sourceAttrs.defaultRunStyle)
    ? sourceAttrs.defaultRunStyle
    : {};
  const defaultRunStyle = {
    ...sourceDefault,
    ...runStyleFromMarks(marks),
  };

  return splitBlockKeepMarks(
    state,
    dispatch === undefined
      ? undefined
      : (transaction) => {
          transaction.removeStoredMark(sdmTextSchema.marks.action);
          dispatch(
            withInheritedParagraphAttrs(
              transaction,
              sourceAttrs,
              defaultRunStyle,
            ),
          );
        },
    view,
  );
};
