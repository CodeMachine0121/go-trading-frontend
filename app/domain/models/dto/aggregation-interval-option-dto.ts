import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'

/** DTO：彙總刻度清單上的一個選項。 */
export class AggregationIntervalOptionDto {
  constructor(
    public readonly value: AggregationIntervalValue,
    public readonly label: LocalizedTextVo,
  ) {}
}
