import type Decimal from 'decimal.js'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 日期與價格範圍量出來的那幾個數。 */
export class DateAndPriceRangeMeasurementDto {
  constructor(
    public readonly priceDifference: Decimal,
    /** 小數兩位、帶正負號的百分比；第一點價格為零時算不出來，是 `null`。 */
    public readonly percentText: string | null,
    public readonly kCandleCount: number,
    public readonly duration: LocalizedTextVo,
    public readonly volume: Decimal,
    /** 價差不小於零。決定框與說明往哪一頭畫。 */
    public readonly rising: boolean,
    /** 這個範圍畫成什麼顏色：上漲藍、下跌紅。 */
    public readonly colorToken: string,
  ) {}
}
