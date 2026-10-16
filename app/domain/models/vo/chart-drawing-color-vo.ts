import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 繪圖可以挑的一個顏色。
 *
 * 留存的是 token 名字，不是色碼：顏色的字面值只住在樣式中央層，
 * 而同一個名字在亮色與暗色下各自是對的那一個值。
 */
export class ChartDrawingColorVo {
  constructor(
    public readonly token: string,
    public readonly label: LocalizedTextVo,
  ) {}
}

/** 浮動工具列上的調色盤，照 TradingView 的那一排排列。 */
export const CHART_DRAWING_COLORS: readonly ChartDrawingColorVo[] = [
  new ChartDrawingColorVo('--color-drawing-red', new LocalizedTextVo('紅', 'Red')),
  new ChartDrawingColorVo('--color-drawing-orange', new LocalizedTextVo('橙', 'Orange')),
  new ChartDrawingColorVo('--color-drawing-yellow', new LocalizedTextVo('黃', 'Yellow')),
  new ChartDrawingColorVo('--color-drawing-green', new LocalizedTextVo('綠', 'Green')),
  new ChartDrawingColorVo('--color-drawing-teal', new LocalizedTextVo('青綠', 'Teal')),
  new ChartDrawingColorVo('--color-drawing-cyan', new LocalizedTextVo('青', 'Cyan')),
  new ChartDrawingColorVo('--color-drawing-blue', new LocalizedTextVo('藍', 'Blue')),
  new ChartDrawingColorVo('--color-drawing-indigo', new LocalizedTextVo('靛', 'Indigo')),
  new ChartDrawingColorVo('--color-drawing-purple', new LocalizedTextVo('紫', 'Purple')),
  new ChartDrawingColorVo('--color-drawing-pink', new LocalizedTextVo('粉', 'Pink')),
  new ChartDrawingColorVo('--color-drawing-gray', new LocalizedTextVo('灰', 'Gray')),
  new ChartDrawingColorVo('--color-drawing-silver', new LocalizedTextVo('銀', 'Silver')),
]

export const DRAWING_BLUE_TOKEN = '--color-drawing-blue'
export const DRAWING_PURPLE_TOKEN = '--color-drawing-purple'
export const DRAWING_GRAY_TOKEN = '--color-drawing-gray'
