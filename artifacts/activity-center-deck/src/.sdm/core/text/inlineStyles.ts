import {
  SDM_DEFAULT_TEXT_SIZE_PT,
  SDM_POINT_TO_UNIT,
  type Color,
  type Font,
  type Paragraph,
  type RunStyle,
  type Theme,
} from '../schema';

export interface SdmTextCssStyle {
  backgroundColor?: string;
  color?: string;
  display?: 'inline-block';
  fontFamily?: string;
  fontSize?: string;
  fontStyle?: 'italic' | 'normal';
  fontWeight?: number;
  letterSpacing?: string;
  lineHeight?: number;
  marginBottom?: string;
  marginTop?: string;
  minWidth?: string;
  paddingLeft?: string;
  textAlign?: Paragraph['align'];
  textDecoration?: string;
  textIndent?: string;
  whiteSpace?: 'pre-wrap';
}

export const SDM_DEFAULT_LIST_INDENT_PT = 36;
export const SDM_DEFAULT_MARKER_HANG_PT = 24;

function themeValue(
  record: Record<string, string> | undefined,
  token: string,
): string | undefined {
  return record !== undefined && Object.hasOwn(record, token)
    ? record[token]
    : undefined;
}

export function resolveTextColor(color: Color, theme?: Theme): string {
  if (color.kind === 'rgb') {
    return color.value;
  }

  return themeValue(theme?.colors, color.token) ?? '#000000';
}

export function resolveTextFont(
  font: Font | undefined,
  theme?: Theme,
): string | undefined {
  if (font === undefined) {
    return undefined;
  }
  if (font.kind === 'family') {
    return font.family;
  }

  return themeValue(theme?.fonts, font.token);
}

export function runStylePropertyCss(
  style: Partial<RunStyle>,
  theme?: Theme,
): SdmTextCssStyle {
  const hasTextDecoration =
    Object.hasOwn(style, 'underline') || Object.hasOwn(style, 'strike');

  return {
    ...(style.color === undefined
      ? {}
      : { color: resolveTextColor(style.color, theme) }),
    ...(style.highlight === undefined
      ? {}
      : { backgroundColor: resolveTextColor(style.highlight, theme) }),
    ...(style.font === undefined
      ? {}
      : { fontFamily: resolveTextFont(style.font, theme) }),
    ...(style.sizePt === undefined
      ? {}
      : { fontSize: `${style.sizePt * SDM_POINT_TO_UNIT}px` }),
    ...(style.weight === undefined ? {} : { fontWeight: style.weight }),
    ...(style.italic === undefined
      ? {}
      : { fontStyle: style.italic ? 'italic' : 'normal' }),
    ...(hasTextDecoration
      ? {
          textDecoration:
            [
              style.underline ? 'underline' : '',
              style.strike ? 'line-through' : '',
            ]
              .filter(Boolean)
              .join(' ') || 'none',
        }
      : {}),
    ...(style.letterSpacingPt === undefined
      ? {}
      : {
          letterSpacing: `${style.letterSpacingPt * SDM_POINT_TO_UNIT}px`,
        }),
  };
}

export function effectiveRunStyleCss(
  style: RunStyle,
  theme?: Theme,
): SdmTextCssStyle {
  return {
    fontSize: `${(style.sizePt ?? SDM_DEFAULT_TEXT_SIZE_PT) * SDM_POINT_TO_UNIT}px`,
    whiteSpace: 'pre-wrap',
    ...runStylePropertyCss(style, theme),
  };
}

function hasMarker(paragraph: Paragraph): boolean {
  return paragraph.bullet !== undefined && paragraph.bullet.kind !== 'none';
}

export function paragraphLayoutCss(paragraph: Paragraph): SdmTextCssStyle {
  const markerHangPt = hasMarker(paragraph) ? SDM_DEFAULT_MARKER_HANG_PT : 0;
  const indentPt =
    (paragraph.level ?? 0) * SDM_DEFAULT_LIST_INDENT_PT + markerHangPt;

  return {
    textAlign: paragraph.align,
    lineHeight: paragraph.lineHeight ?? 1.2,
    paddingLeft:
      indentPt === 0 ? undefined : `${indentPt * SDM_POINT_TO_UNIT}px`,
    textIndent:
      markerHangPt === 0 ? undefined : `${-markerHangPt * SDM_POINT_TO_UNIT}px`,
    marginTop:
      paragraph.spaceBeforePt === undefined
        ? undefined
        : `${paragraph.spaceBeforePt * SDM_POINT_TO_UNIT}px`,
    marginBottom:
      paragraph.spaceAfterPt === undefined
        ? undefined
        : `${paragraph.spaceAfterPt * SDM_POINT_TO_UNIT}px`,
  };
}

export function paragraphMarkerCss(
  paragraph: Paragraph,
  theme?: Theme,
): SdmTextCssStyle {
  return {
    ...effectiveRunStyleCss(
      {
        ...paragraph.defaultRunStyle,
        ...paragraph.runs[0],
      },
      theme,
    ),
    display: 'inline-block',
    minWidth: `${SDM_DEFAULT_MARKER_HANG_PT * SDM_POINT_TO_UNIT}px`,
    textIndent: '0',
  };
}
