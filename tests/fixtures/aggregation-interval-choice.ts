import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { aggregationIntervalNamed } from './aggregation-interval'

/**
 * 「沒挑」——一進畫面的樣子，也是多數測試不在意粗細時該帶的那一個。
 * 多數測試在意的是那批 K 線而不是粗細；在意粗細的那幾個自己說出來。
 */
export const AUTOMATIC_AGGREGATION_INTERVAL_CHOICE = new AggregationIntervalChoiceDto('自動', null)

/** 挑了固定的一種。標籤取自真的那份刻度清單，測試才不會與畫面說不同的話。 */
export function aggregationIntervalChoiceOf(value: string): AggregationIntervalChoiceDto {
  const aggregationInterval = aggregationIntervalNamed(value)

  return new AggregationIntervalChoiceDto(aggregationInterval.label, aggregationInterval)
}
