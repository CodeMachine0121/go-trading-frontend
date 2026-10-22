import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import {
  DRAWING_BLUE_TOKEN,
  DRAWING_GRAY_TOKEN,
  DRAWING_ORANGE_TOKEN,
  DRAWING_PURPLE_TOKEN,
} from '~/domain/models/vo/chart-drawing-color-vo'

export type ChartDrawingKindValue
  = 'trendLine' | 'ray' | 'horizontalLine' | 'horizontalRay' | 'verticalLine'
    | 'fibonacciRetracement' | 'rectangle' | 'dateAndPriceRange' | 'brush'

/** 左邊細邊上，繪圖工具收在哪一格。游標那一格不是繪圖，另見 `ChartCursorStyleVo`。 */
export type ChartDrawingToolGroupValue = 'lines' | 'fibonacci' | 'shapes' | 'brush' | 'measure'

/**
 * 一個快捷鍵：一律按著 ⌥（Alt），再加一個鍵。
 *
 * 認的是**鍵的位置**而不是打出來的字：在 macOS 上按著 ⌥ 打 T 出來的是「†」，
 * 認字的話這一組快捷鍵在 Mac 上一個都按不出來。
 */
export class ChartDrawingShortcutVo {
  constructor(
    public readonly keyCode: string,
    public readonly withShift: boolean,
    public readonly label: string,
  ) {}
}

/**
 * 一種繪圖的目錄條目：它要幾個點、預設長什麼樣、收在哪一格、快捷鍵是什麼、是不是按住拖曳的自由筆跡。
 *
 * **加一種繪圖就是在下面那張表加一列。** 工具列、快捷鍵、預設樣式都從這張表讀，
 * 不在任何地方另寫一份 switch。
 */
export class ChartDrawingKindVo {
  constructor(
    public readonly value: ChartDrawingKindValue,
    public readonly label: LocalizedTextVo,
    public readonly minimumAnchorCount: number,
    public readonly maximumAnchorCount: number,
    public readonly toolGroup: ChartDrawingToolGroupValue,
    public readonly shortcut: ChartDrawingShortcutVo | null,
    public readonly defaultColorToken: string,
    public readonly defaultLineWidth: number,
    /** 斐波那契回撤與日期與價格範圍用固定配色，不讓人改線色、線寬與線型。 */
    public readonly styleEditable: boolean,
    /** 自由筆跡：按住拖曳取點，點不對齊到 K 線、不吸磁鐵、沒有逐點把手。 */
    public readonly freehand: boolean = false,
  ) {}
}

const TREND_LINE = new ChartDrawingKindVo('trendLine', new LocalizedTextVo('趨勢線', 'Trend line'), 2, 2, 'lines',
  new ChartDrawingShortcutVo('KeyT', false, '⌥T'), DRAWING_BLUE_TOKEN, 2, true)

export const CHART_DRAWING_KINDS: readonly ChartDrawingKindVo[] = [
  TREND_LINE,
  new ChartDrawingKindVo('ray', new LocalizedTextVo('射線', 'Ray'), 2, 2, 'lines',
    null, DRAWING_BLUE_TOKEN, 2, true),
  new ChartDrawingKindVo('horizontalLine', new LocalizedTextVo('水平線', 'Horizontal line'), 1, 1, 'lines',
    new ChartDrawingShortcutVo('KeyH', false, '⌥H'), DRAWING_BLUE_TOKEN, 1, true),
  new ChartDrawingKindVo('horizontalRay', new LocalizedTextVo('水平射線', 'Horizontal ray'), 1, 1, 'lines',
    new ChartDrawingShortcutVo('KeyJ', false, '⌥J'), DRAWING_BLUE_TOKEN, 1, true),
  new ChartDrawingKindVo('verticalLine', new LocalizedTextVo('垂直線', 'Vertical line'), 1, 1, 'lines',
    new ChartDrawingShortcutVo('KeyV', false, '⌥V'), DRAWING_BLUE_TOKEN, 1, true),
  new ChartDrawingKindVo('fibonacciRetracement', new LocalizedTextVo('斐波那契回撤', 'Fib retracement'), 2, 2, 'fibonacci',
    new ChartDrawingShortcutVo('KeyF', false, '⌥F'), DRAWING_GRAY_TOKEN, 1, false),
  new ChartDrawingKindVo('rectangle', new LocalizedTextVo('矩形', 'Rectangle'), 2, 2, 'shapes',
    new ChartDrawingShortcutVo('KeyR', true, '⌥⇧R'), DRAWING_PURPLE_TOKEN, 1, true),
  new ChartDrawingKindVo('dateAndPriceRange', new LocalizedTextVo('日期與價格範圍', 'Date and price range'), 2, 2, 'measure',
    null, DRAWING_BLUE_TOKEN, 1, false),
  new ChartDrawingKindVo('brush', new LocalizedTextVo('奇異筆', 'Brush'), 2, 200, 'brush',
    null, DRAWING_ORANGE_TOKEN, 2, true, true),
]

/** 認不得的種類一律退回趨勢線——留存可能來自另一個版本，不讓一個陌生字串弄壞整張圖。 */
export function chartDrawingKindOf(value: string): ChartDrawingKindVo {
  return CHART_DRAWING_KINDS.find(kind => kind.value === value) ?? TREND_LINE
}

export function isChartDrawingKindValue(value: unknown): value is ChartDrawingKindValue {
  return CHART_DRAWING_KINDS.some(kind => kind.value === value)
}

/** 一格工具格的名稱。 */
export class ChartDrawingToolGroupVo {
  constructor(
    public readonly value: ChartDrawingToolGroupValue,
    public readonly label: LocalizedTextVo,
  ) {}
}

/** 工具格的排列順序，由上往下。 */
export const CHART_DRAWING_TOOL_GROUPS: readonly ChartDrawingToolGroupVo[] = [
  new ChartDrawingToolGroupVo('lines', new LocalizedTextVo('線', 'Lines')),
  new ChartDrawingToolGroupVo('fibonacci', new LocalizedTextVo('斐波那契', 'Fibonacci')),
  new ChartDrawingToolGroupVo('shapes', new LocalizedTextVo('形狀', 'Shapes')),
  new ChartDrawingToolGroupVo('brush', new LocalizedTextVo('奇異筆', 'Brush')),
  new ChartDrawingToolGroupVo('measure', new LocalizedTextVo('測量', 'Measure')),
]
