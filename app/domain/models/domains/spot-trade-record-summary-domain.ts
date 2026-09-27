import type { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import { SpotTradeRecordRowDto } from '~/domain/models/dto/spot-trade-record-row-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'
import { SpotTradeStatusDomain } from '~/domain/models/domains/spot-trade-status-domain'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const FLOATING_NOTE = '浮'
const NOT_APPLICABLE_TEXT = '—'
const PROFIT_LABEL = '淨損益'
const RETURN_RATE_LABEL = '報酬率'
const RETURN_RATE_FRACTION_DIGITS = 2
const PERCENT = 100

export class SpotTradeRecordSummaryDomain {
  constructor(private readonly record: SpotTradeRecord) {}

  toRowDto(): SpotTradeRecordRowDto {
    const status = new SpotTradeStatusDomain(this.record.status)
    const outcome = this.record.outcome
    const source = this.record.source

    return new SpotTradeRecordRowDto(
      this.record.id,
      this.record.symbol,
      new SpotTradeMarketDomain(this.record.market).label,
      this.record.status,
      status.label,
      status.tone,
      status.awaitsReview,
      source === null
        ? new TradeLinkedStrategyDomain(
          this.record.tradingStrategyId,
          this.record.tradingStrategyName,
          this.record.tradingStrategyDeleted).label
        : `${source.strategyBotName} #${source.runNumber}`,
      new JournalNumberDomain(outcome.averageBuyPrice).price(),
      outcome.averageSellPrice === null ? NOT_APPLICABLE_TEXT : new JournalNumberDomain(outcome.averageSellPrice).price(),
      status.isOpen
        ? new TradeMeasureDomain(outcome.floatingProfit).toFigure(
            PROFIT_LABEL,
            value => new JournalNumberDomain(value).signedAmount(),
            value => new JournalNumberDomain(value).tone(),
            FLOATING_NOTE)
        : new TradeFigureVo(
            PROFIT_LABEL, new JournalNumberDomain(outcome.netProfit).signedAmount(), new JournalNumberDomain(outcome.netProfit).tone()),
      status.isOpen
        ? new TradeFigureVo(RETURN_RATE_LABEL, NOT_APPLICABLE_TEXT, 'muted')
        : new TradeMeasureDomain(outcome.returnRate).toFigure(
            RETURN_RATE_LABEL,
            value => new JournalNumberDomain(value.times(PERCENT)).signedPercentage(RETURN_RATE_FRACTION_DIGITS),
            value => new JournalNumberDomain(value).tone()),
      this.record.tags.map(tag => new TradeTagChipVo(tag.name, tag.kind === 'mistake' ? 'danger' : 'neutral')),
    )
  }
}
