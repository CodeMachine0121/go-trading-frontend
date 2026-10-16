import type Decimal from 'decimal.js'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'

/** 圖例第一行與價格軸倒數要說的那幾個值。 */
export class ChartReadoutDto {
  constructor(
    /** 十字線所在那一根；十字線不在任何一根上時是最新那一根。 */
    public readonly kCandle: KCandleDto,
    /** 相對前一根收盤的漲跌；第一根沒有前一根，相對它自己的開盤。 */
    public readonly change: Decimal,
    public readonly changePercentText: string | null,
    public readonly tone: 'success' | 'danger' | 'neutral',
    /** 最新那一根還有多久收完；已經收完時是 `null`。 */
    public readonly countdown: string | null,
  ) {}
}
