import type { ContractTradeRecordSummary } from '~/domain/models/entities/contract-trade-record-summary'
import type { ContractTradeStatistics } from '~/domain/models/entities/contract-trade-statistics'
import type { ContractTradeListFilterDto } from '~/domain/models/dto/contract-trade-list-filter-dto'
import { ContractTradeListDto } from '~/domain/models/dto/contract-trade-list-dto'
import { ContractTradeStatusDomain } from '~/domain/models/domains/contract-trade-status-domain'
import { ContractTradeStatisticsDomain } from '~/domain/models/domains/contract-trade-statistics-domain'
import { ContractTradeRecordSummaryDomain } from '~/domain/models/domains/contract-trade-record-summary-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const NO_TRADES_MESSAGE = new LocalizedTextVo(
  '還沒有任何交易。收到機器人信號下單後，可以點訊息裡的「記到交易日誌」，或按「記一筆」。',
  'No trades yet. After placing an order on a bot signal, tap "Record in trade journal" in the message, or press "Record a trade".')
const NO_MATCHING_TRADES_MESSAGE = new LocalizedTextVo('沒有符合篩選的交易', 'No trades match the filters')

export class ContractTradeListDomain {
  constructor(
    private readonly summaries: readonly ContractTradeRecordSummary[],
    private readonly statistics: ContractTradeStatistics,
    private readonly filter: ContractTradeListFilterDto,
  ) {}

  toDto(): ContractTradeListDto {
    const statisticsDomain = new ContractTradeStatisticsDomain(this.statistics)
    const rows = this.summaries
      .filter(summary => this.filter.status === 'all' || summary.status === this.filter.status)
      .filter(summary => this.filter.source === 'all'
        || (this.filter.source === 'linked') === (summary.tradingStrategyId !== null))
      .filter(summary => this.filter.symbol === '' || summary.symbol === this.filter.symbol)
      .map(summary => new ContractTradeRecordSummaryDomain(summary).toRowDto())

    const matchingMessage = rows.length === 0 ? NO_MATCHING_TRADES_MESSAGE : null
    const emptyMessage = this.summaries.length === 0 ? NO_TRADES_MESSAGE : matchingMessage

    const openTradeCount = this.summaries.filter(summary => new ContractTradeStatusDomain(summary.status).isOpen).length

    return new ContractTradeListDto(
      statisticsDomain.periodLabel,
      new LocalizedTextVo(
        `已平倉 ${this.statistics.closedTradeCount} 筆・持倉中 ${openTradeCount} 筆`,
        `${this.statistics.closedTradeCount} closed · ${openTradeCount} open`),
      this.statistics.closedTradeCount === 0 ? [] : statisticsDomain.summaryFigures(),
      rows,
      this.summaries.filter(summary => new ContractTradeStatusDomain(summary.status).awaitsReview).length,
      [...new Set(this.summaries.map(summary => summary.symbol))].sort(),
      emptyMessage,
    )
  }
}
