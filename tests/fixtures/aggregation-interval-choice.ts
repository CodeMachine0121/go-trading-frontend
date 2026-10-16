import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { aggregationIntervalNamed } from './aggregation-interval'

/** 挑了某一種。標籤取自真的那份刻度清單，測試才不會與畫面說不同的話。 */
export function aggregationIntervalChoiceOf(value: string): AggregationIntervalChoiceDto {
  return new AggregationIntervalChoiceDto(aggregationIntervalNamed(value))
}

/**
 * 一進畫面的那一種（一小時），也是多數測試不在意粗細時該帶的那一個。
 * 多數測試在意的是那批 K 線而不是粗細；在意粗細的那幾個自己說出來。
 */
export const DEFAULT_AGGREGATION_INTERVAL_CHOICE = aggregationIntervalChoiceOf('1h')
