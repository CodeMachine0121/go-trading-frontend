import type { KCandleContractDto } from '~/domain/models/dto/k-candle-contract-dto'

/**
 * DTO：一次合約 K 線查詢的結果形狀。
 * 清單已由新到舊排好，筆數與「是否查無資料」也一併算好——
 * 畫面不必自己數、也不必自己判斷空狀態。
 */
export class KCandleContractSearchResultDto {
  constructor(public readonly kCandleContracts: KCandleContractDto[]) {}

  get count(): number {
    return this.kCandleContracts.length
  }

  get isEmpty(): boolean {
    return this.kCandleContracts.length === 0
  }
}
