import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * 指名一種彙總刻度。
 *
 * 刻意**不用** production 的 `aggregationIntervalOf()`：它認不得代號時退回最細的那一種，
 * 那對畫面是對的（一張稍微細一點的圖勝過一個錯誤），但對測試是災難——
 * 打錯一個字會讓案例默默改測另一種刻度，而它照樣是綠的。
 */
export function aggregationIntervalNamed(value: string): AggregationIntervalVo {
  const aggregationInterval = AGGREGATION_INTERVALS.find(candidate => candidate.value === value)
  if (aggregationInterval === undefined) {
    throw new Error(`測試用了一個不存在的彙總刻度：${value}`)
  }

  return aggregationInterval
}
