import type { ContractTradeRecordSummary } from '~/domain/models/entities/contract-trade-record-summary'
import { ContractTradeRecordRowDto } from '~/domain/models/dto/contract-trade-record-row-dto'
import { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'
import { ContractTradeDirectionDomain } from '~/domain/models/domains/contract-trade-direction-domain'
import { ContractTradeStatusDomain } from '~/domain/models/domains/contract-trade-status-domain'
import { ContractTradeMeasureDomain } from '~/domain/models/domains/contract-trade-measure-domain'
import { ContractTradeLinkedStrategyDomain } from '~/domain/models/domains/contract-trade-linked-strategy-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const FLOATING_NOTE = '浮動'
const NOT_APPLICABLE_TEXT = '—'
const PROFIT_LABEL = '損益'

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
      new ContractTradeLinkedStrategyDomain(
        this.summary.tradingStrategyId,
        this.summary.tradingStrategyName,
        this.summary.tradingStrategyDeleted).label,
      new JournalNumberDomain(this.summary.averageEntryPrice).price(),
      this.summary.averageExitPrice === null
        ? NOT_APPLICABLE_TEXT
        : new JournalNumberDomain(this.summary.averageExitPrice).price(),
      status.isOpen || netProfit === null
        ? new ContractTradeMeasureDomain(this.summary.floatingProfit).toFigure(
            PROFIT_LABEL,
            value => new JournalNumberDomain(value).signedAmount(),
            value => new JournalNumberDomain(value).tone(),
            FLOATING_NOTE)
        : new ContractTradeFigureVo(
            PROFIT_LABEL, new JournalNumberDomain(netProfit).signedAmount(), new JournalNumberDomain(netProfit).tone()),
      new ContractTradeMeasureDomain(this.summary.rMultiple).toFigure(
        'R', value => new JournalNumberDomain(value).rMultiple(), () => 'neutral').text,
      this.summary.tags.map(tag => tag.name),
    )
  }
}
