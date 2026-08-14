import { Value } from '@sinclair/typebox/value';
import type { EditorState } from 'prosemirror-state';

import {
  BulletSchema,
  RunStyleSchema,
  type Bullet,
  type Paragraph,
  type RunStyle,
} from '../schema';
import { canonicalizeRunStyle, runStyleFromMarks } from './pmDoc';
import { sdmTextSchema } from './pmSchema';

export interface SdmSelectionFormatting {
  align: NonNullable<Paragraph['align']>;
  bullet: Bullet | null;
  level: number;
  runStyle: RunStyle;
}

/**
 * Effective formatting at the selection head: the paragraph's default run
 * style overlaid with the marks at the caret (stored marks win while typing),
 * plus the paragraph attributes formatting controls reflect.
 */
export function selectionFormatting(
  state: EditorState,
): SdmSelectionFormatting {
  const parent = state.selection.$head.parent;
  const attrs: Record<string, unknown> =
    parent.type === sdmTextSchema.nodes.paragraph ? parent.attrs : {};
  const align =
    attrs.align === 'center' ||
    attrs.align === 'right' ||
    attrs.align === 'justify'
      ? attrs.align
      : 'left';
  const level =
    typeof attrs.level === 'number' &&
    Number.isInteger(attrs.level) &&
    attrs.level >= 0 &&
    attrs.level <= 8
      ? attrs.level
      : 0;
  const bullet = Value.Check(BulletSchema, attrs.bullet) ? attrs.bullet : null;
  const defaultRunStyle = Value.Check(RunStyleSchema, attrs.defaultRunStyle)
    ? attrs.defaultRunStyle
    : undefined;
  const markStyle = runStyleFromMarks(
    state.storedMarks ?? state.selection.$head.marks(),
  );

  return {
    align,
    bullet,
    level,
    runStyle: canonicalizeRunStyle({ ...defaultRunStyle, ...markStyle }),
  };
}
