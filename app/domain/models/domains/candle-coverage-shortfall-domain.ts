import type { CandleCoverageShortfallVo } from '~/domain/models/vo/candle-coverage-shortfall-vo'

/**
 * Domain Model：走完的刻度區間連一個值都湊不出來時，該對使用者說的那一句話。
 *
 * 它與「畫不滿」那一句刻意分開。兩句話講的是不同的事：
 * 那一句是**通知**（填滿要幾根、實際採用幾根，線照樣畫，不必做任何事），
 * 這一句是**拒絕**（湊得出幾根、至少要幾根，什麼都畫不出來，得動手）。
 * 數字不同、用途不同，改動的理由也不同。
 *
 * **兩條出路必須與「要得太多」那一句相反。** 這裡歷史不夠深，出路是讓每一格涵蓋短一點
 * （同一段時間就切出更多格）或把缺的歷史補回來；那裡是一次要得太多，出路是縮短區間
 * 或讓每一格涵蓋長一點。講成同一句，使用者會照著往錯的方向調——而兩個方向都調得動，
 * 所以他不會發現自己在往反方向走。
 */
export class CandleCoverageShortfallDomain {
  constructor(private readonly shortfall: CandleCoverageShortfallVo) {}

  message(): string {
    return `這段區間只湊得出 ${this.shortfall.availableCandleCount} 根 K 線，`
      + `而這支策略至少要 ${this.shortfall.minimumCandleCount} 根才算得出一個值。`
      + '請拉近一點看（每根涵蓋的時間會變短），或先按「立刻更新」把缺的歷史補回來。'
  }
}
