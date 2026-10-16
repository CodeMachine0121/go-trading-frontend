import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { MAXIMUM_FETCHED_CANDLE_COUNT } from '~/domain/models/vo/k-candle-chart-load-plan-vo'

const MILLISECONDS_PER_MINUTE = 60 * 1000

/**
 * Domain Model：一段時間，以及畫它時合適的粗細——**塞得進上限的最細那一種**。
 *
 * 圖表的粗細由看的人挑；但一筆交易的走勢沒有人挑，畫面要自己挑一種：
 * 越細看得越清楚，卻不能細到後端一次答不完。長到連最粗的都塞不下時，就用最粗的。
 */
export class FittingAggregationIntervalDomain {
  constructor(
    private readonly startTime: Date,
    private readonly endTime: Date,
  ) {}

  toChoiceDto(): AggregationIntervalChoiceDto {
    const spanMinutes = (this.endTime.getTime() - this.startTime.getTime()) / MILLISECONDS_PER_MINUTE
    const fitting = AGGREGATION_INTERVALS.find(
      interval => spanMinutes / interval.minutes <= MAXIMUM_FETCHED_CANDLE_COUNT)
    ?? AGGREGATION_INTERVALS[AGGREGATION_INTERVALS.length - 1]

    return new AggregationIntervalChoiceDto(fitting)
  }
}
