import { KCandleSeriesVo } from '~/domain/models/vo/k-candle-series-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import type { KCandle } from '~/domain/models/entities/k-candle'

/**
 * 取一段行情回來的樣子：那批 K 線，加上**系統說它用了哪一種刻度**。
 *
 * 刻度預設一分鐘，因為多數測試在意的是那批 K 線而不是粗細；
 * 在意粗細的那幾個自己說出來，讀起來就看得出它是這個案例的重點。
 */
export function seriesOf(kCandles: KCandle[], interval = '1m'): KCandleSeriesVo {
  return new KCandleSeriesVo(kCandles, aggregationIntervalOf(interval))
}
