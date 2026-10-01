import type { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import { SpotTradeRecordRowDto } from '~/domain/models/dto/spot-trade-record-row-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'
import { SpotTradeStatusDomain } from '~/domain/models/domains/spot-trade-status-domain'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const FLOATING_NOTE = new LocalizedTextVo('浮', 'unrealized')
const NOT_APPLICABLE_TEXT = '—'
const NOT_APPLICABLE_FIGURE_TEXT = new UntranslatedTextVo(NOT_APPLICABLE_TEXT)
const PROFIT_LABEL = new LocalizedTextVo('淨損益', 'Net P&L')
const RETURN_RATE_LABEL = new LocalizedTextVo('報酬率', 'Return')
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
        : new UntranslatedTextVo(`${source.strategyBotName} #${source.runNumber}`),
      new JournalNumberDomain(outcome.averageBuyPrice).price(),
      outcome.averageSellPrice === null ? NOT_APPLICABLE_TEXT : new JournalNumberDomain(outcome.averageSellPrice).price(),
      status.isOpen
        ? new TradeMeasureDomain(outcome.floatingProfit).toFigure(
            PROFIT_LABEL,
            value => new UntranslatedTextVo(new JournalNumberDomain(value).signedAmount()),
            value => new JournalNumberDomain(value).tone(),
            FLOATING_NOTE)
        : new TradeFigureVo(
            PROFIT_LABEL,
            new UntranslatedTextVo(new JournalNumberDomain(outcome.netProfit).signedAmount()),
            new JournalNumberDomain(outcome.netProfit).tone()),
      status.isOpen
        ? new TradeFigureVo(RETURN_RATE_LABEL, NOT_APPLICABLE_FIGURE_TEXT, 'muted')
        : new TradeMeasureDomain(outcome.returnRate).toFigure(
            RETURN_RATE_LABEL,
            value => new UntranslatedTextVo(
              new JournalNumberDomain(value.times(PERCENT)).signedPercentage(RETURN_RATE_FRACTION_DIGITS)),
            value => new JournalNumberDomain(value).tone()),
      this.record.tags.map(tag => new TradeTagChipVo(tag.name, tag.kind === 'mistake' ? 'danger' : 'neutral')),
    )
  }
}
