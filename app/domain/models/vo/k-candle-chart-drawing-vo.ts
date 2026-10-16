import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 畫法：同一批 K 線要怎麼畫。純呈現選擇，不影響取哪一段。 */
export type KCandleChartDrawing = 'candlestick' | 'bar' | 'line' | 'area'

export class KCandleChartDrawingVo {
  constructor(
    public readonly value: KCandleChartDrawing,
    public readonly label: LocalizedTextVo,
  ) {}
}

/** 畫法選單上的四種，第一種是預設。 */
export const K_CANDLE_CHART_DRAWINGS: readonly KCandleChartDrawingVo[] = [
  new KCandleChartDrawingVo('candlestick', new LocalizedTextVo('蠟燭', 'Candles')),
  new KCandleChartDrawingVo('bar', new LocalizedTextVo('美國線', 'Bars')),
  new KCandleChartDrawingVo('line', new LocalizedTextVo('曲線', 'Line')),
  new KCandleChartDrawingVo('area', new LocalizedTextVo('面積', 'Area')),
]
