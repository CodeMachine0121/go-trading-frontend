import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'

/**
 * DTO：一次查詢的結果形狀。
 * 清單已由新到舊排好，筆數與「是否查無資料」也一併算好——
 * 畫面不必自己數、也不必自己判斷空狀態。
 */
export class KCandleSearchResultDto {
  constructor(public readonly kCandles: KCandleDto[]) {}

  get count(): number {
    return this.kCandles.length
  }

  get isEmpty(): boolean {
    return this.kCandles.length === 0
  }
}
