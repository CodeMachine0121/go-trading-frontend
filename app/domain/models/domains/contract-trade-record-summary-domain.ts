import type { ContractTradeRecordSummary } from '~/domain/models/entities/contract-trade-record-summary'
import { ContractTradeRecordRowDto } from '~/domain/models/dto/contract-trade-record-row-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { ContractTradeDirectionDomain } from '~/domain/models/domains/contract-trade-direction-domain'
import { ContractTradeStatusDomain } from '~/domain/models/domains/contract-trade-status-domain'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { TradeTagChipVo } from '~/domain/models/vo/trade-tag-chip-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const FLOATING_NOTE = new LocalizedTextVo('浮', 'unrealized')
const NOT_APPLICABLE_TEXT = '—'
const PROFIT_LABEL = new LocalizedTextVo('損益', 'P&L')

export class ContractTradeRecordSummaryDomain {
  constructor(private readonly summary: ContractTradeRecordSummary) {}

  toRowDto(): ContractTradeRecordRowDto {
    const direction = new ContractTradeDirectionDomain(this.summary.direction, this.summary.leverage)
    const status = new ContractTradeStatusDomain(this.summary.status)
    const netProfit = this.summary.netProfit

    return new ContractTradeRecordRowDto(
      this.summary.id,
      this.summary.symbol,
      direction.label,
      direction.tone,
      this.summary.status,
      status.label,
      status.tone,
      status.awaitsReview,
      this.summary.source === null
        ? new TradeLinkedStrategyDomain(
          this.summary.tradingStrategyId,
          this.summary.tradingStrategyName,
          this.summary.tradingStrategyDeleted).label
        : new UntranslatedTextVo(`${this.summary.source.strategyBotName} #${this.summary.source.runNumber}`),
      new JournalNumberDomain(this.summary.averageEntryPrice).price(),
      this.summary.averageExitPrice === null
        ? NOT_APPLICABLE_TEXT
        : new JournalNumberDomain(this.summary.averageExitPrice).price(),
      status.isOpen || netProfit === null
        ? new TradeMeasureDomain(this.summary.floatingProfit).toFigure(
            PROFIT_LABEL,
            value => new UntranslatedTextVo(new JournalNumberDomain(value).signedAmount()),
            value => new JournalNumberDomain(value).tone(),
            FLOATING_NOTE)
        : new TradeFigureVo(
            PROFIT_LABEL,
            new UntranslatedTextVo(new JournalNumberDomain(netProfit).signedAmount()),
            new JournalNumberDomain(netProfit).tone()),
      new TradeMeasureDomain(this.summary.rMultiple).toFigure(
        new UntranslatedTextVo('R'),
        value => new UntranslatedTextVo(new JournalNumberDomain(value).rMultiple()),
        () => 'neutral').text,
      this.summary.tags.map(tag => new TradeTagChipVo(tag.name, tag.kind === 'mistake' ? 'danger' : 'neutral')),
    )
  }
}
