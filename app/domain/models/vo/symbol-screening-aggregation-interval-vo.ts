import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

export const SYMBOL_SCREENING_AGGREGATION_INTERVALS: readonly AggregationIntervalVo[] = AGGREGATION_INTERVALS
  .filter(interval => interval.value === '4h' || interval.value === '1d')
