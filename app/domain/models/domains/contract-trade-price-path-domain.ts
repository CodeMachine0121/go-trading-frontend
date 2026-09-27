import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { ContractTradePricePathDto } from '~/domain/models/dto/contract-trade-price-path-dto'
import { ContractTradePricePathCandleDto } from '~/domain/models/dto/contract-trade-price-path-candle-dto'
import { ContractTradePricePathMarkerDto } from '~/domain/models/dto/contract-trade-price-path-marker-dto'
import { ContractTradePricePathLineDto } from '~/domain/models/dto/contract-trade-price-path-line-dto'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const MINIMUM_MARGIN_MILLISECONDS = 30 * 60 * 1000
const MARGIN_RATIO = 0.1
const AUTOMATIC_INTERVAL_LABEL = '自動'
const NO_MARKET_DATA_MESSAGE = '沒有行情資料，無法計算'

export class ContractTradePricePathDomain {
  constructor(
    private readonly record: ContractTradeRecordDto,
    private readonly now: Date,
  ) {}

  toLoadPlan(): KCandleChartLoadPlanVo {
    const startTime = this.record.openedAt
    const endTime = this.record.closedAt ?? this.now
    const margin = Math.max(
      MINIMUM_MARGIN_MILLISECONDS, (endTime.getTime() - startTime.getTime()) * MARGIN_RATIO)
    const fetchStartTime = new Date(startTime.getTime() - margin)
    const fetchEndTime = new Date(Math.min(this.now.getTime(), endTime.getTime() + margin))

    return new KCandleChartLoadPlanVo(
      true,
      this.record.symbol,
      fetchStartTime,
      fetchEndTime,
      fetchStartTime,
      fetchEndTime,
      new AggregationIntervalChoiceDto(AUTOMATIC_INTERVAL_LABEL, null),
    )
  }

  toDto(kCandleContracts: readonly KCandleContract[]): ContractTradePricePathDto {
    if (kCandleContracts.length === 0) {
      return new ContractTradePricePathDto([], [], [], NO_MARKET_DATA_MESSAGE)
    }

    const lineSources = [
      { price: this.record.averageEntryPrice, label: '進場均價', tone: 'neutral' as const },
      { price: this.record.plannedStopLossPrice, label: '計畫止損', tone: 'danger' as const },
      { price: this.record.plannedTakeProfitPrice, label: '計畫止盈', tone: 'success' as const },
      { price: this.record.maximumAdversePrice, label: '最大不利', tone: 'muted' as const },
      { price: this.record.maximumFavorablePrice, label: '最大有利', tone: 'muted' as const },
    ]

    return new ContractTradePricePathDto(
      kCandleContracts.map(kCandleContract => new ContractTradePricePathCandleDto(
        kCandleContract.openTime,
        kCandleContract.open,
        kCandleContract.high,
        kCandleContract.low,
        kCandleContract.close,
      )),
      this.record.fills.map(fill => new ContractTradePricePathMarkerDto(
        fill.filledAt, fill.kind, `${fill.kindLabel} ${fill.priceText}`)),
      lineSources.flatMap(lineSource => lineSource.price === null
        ? []
        : [new ContractTradePricePathLineDto(
            lineSource.price, lineSource.label, lineSource.tone, new JournalNumberDomain(lineSource.price).price())]),
      null,
    )
  }
}
