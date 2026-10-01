import type { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import type { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import { TradePricePathCandleDto } from '~/domain/models/dto/trade-price-path-candle-dto'
import { TradePricePathMarkerDto } from '~/domain/models/dto/trade-price-path-marker-dto'
import { TradePricePathLineDto } from '~/domain/models/dto/trade-price-path-line-dto'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const MINIMUM_MARGIN_MILLISECONDS = 30 * 60 * 1000
const MARGIN_RATIO = 0.1
const AUTOMATIC_INTERVAL_LABEL = new LocalizedTextVo('自動', 'Auto')
const NO_MARKET_DATA_MESSAGE = new LocalizedTextVo('沒有行情資料，無法計算', 'No market data, cannot be calculated')

export class SpotTradePricePathDomain {
  constructor(
    private readonly record: SpotTradeRecordDto,
    private readonly now: Date,
  ) {}

  toLoadPlan(): KCandleChartLoadPlanVo {
    const startTime = this.record.openedAt
    const endTime = this.record.closedAt ?? this.now
    const margin = Math.max(MINIMUM_MARGIN_MILLISECONDS, (endTime.getTime() - startTime.getTime()) * MARGIN_RATIO)
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

  toDto(kCandles: readonly KCandle[]): TradePricePathDto {
    if (kCandles.length === 0) {
      return new TradePricePathDto([], [], [], NO_MARKET_DATA_MESSAGE)
    }

    const lineSources = [
      { kind: 'averageBuyPrice' as const, price: this.record.averageBuyPrice, label: new LocalizedTextVo('買進均價', 'Avg buy price'), tone: 'neutral' as const },
      { kind: 'plannedStopLossPrice' as const, price: this.record.plannedStopLossPrice, label: new LocalizedTextVo('計畫止損', 'Planned stop loss'), tone: 'danger' as const },
      { kind: 'plannedTakeProfitPrice' as const, price: this.record.plannedTakeProfitPrice, label: new LocalizedTextVo('計畫止盈', 'Planned take profit'), tone: 'success' as const },
      { kind: 'maximumAdversePrice' as const, price: this.record.maximumAdversePrice, label: new LocalizedTextVo('最大不利', 'Max adverse'), tone: 'muted' as const },
      { kind: 'maximumFavorablePrice' as const, price: this.record.maximumFavorablePrice, label: new LocalizedTextVo('最大有利', 'Max favorable'), tone: 'muted' as const },
    ]

    return new TradePricePathDto(
      kCandles.map(kCandle => new TradePricePathCandleDto(
        kCandle.openTime, kCandle.open, kCandle.high, kCandle.low, kCandle.close)),
      this.record.fills.map(fill => new TradePricePathMarkerDto(
        fill.filledAt, fill.kind === 'buy' ? 'entry' : 'exit', new LocalizedTextVo(
          `${fill.kindLabel.traditionalChinese} ${fill.priceText}`, `${fill.kindLabel.english} ${fill.priceText}`))),
      lineSources.flatMap(lineSource => lineSource.price === null
        ? []
        : [new TradePricePathLineDto(
            lineSource.kind,
            lineSource.price, lineSource.label, lineSource.tone, new JournalNumberDomain(lineSource.price).price())]),
      null,
    )
  }
}
