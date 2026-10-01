import type { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import type { SpotTradeStatistics } from '~/domain/models/entities/spot-trade-statistics'
import type { SpotTradeListFilterDto } from '~/domain/models/dto/spot-trade-list-filter-dto'
import { SpotTradeListDto } from '~/domain/models/dto/spot-trade-list-dto'
import { SpotTradeMarketSummaryDto } from '~/domain/models/dto/spot-trade-market-summary-dto'
import { SpotTradeStatusDomain } from '~/domain/models/domains/spot-trade-status-domain'
import { SpotTradeStatisticsDomain } from '~/domain/models/domains/spot-trade-statistics-domain'
import { SpotTradeRecordSummaryDomain } from '~/domain/models/domains/spot-trade-record-summary-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const NO_TRADES_MESSAGE = new LocalizedTextVo(
  '還沒有任何現貨交易。收到機器人信號下單後，可以點訊息裡的「記到交易日誌」，或按「記一筆」。',
  'No spot trades yet. After placing an order on a bot signal, tap "Log to trade journal" in the message, or press "Log a trade".')
const NO_MATCHING_TRADES_MESSAGE = new LocalizedTextVo('沒有符合篩選的交易', 'No trades match the filters')

export class SpotTradeListDomain {
  constructor(
    private readonly records: readonly SpotTradeRecord[],
    private readonly statistics: SpotTradeStatistics,
    private readonly filter: SpotTradeListFilterDto,
  ) {}

  toDto(): SpotTradeListDto {
    const statisticsDomain = new SpotTradeStatisticsDomain(this.statistics)
    const marketDomains = statisticsDomain.marketDomains
    const closedTradeCount = marketDomains.reduce((total, market) => total + market.closedTradeCount, 0)
    const openTradeCount = this.records.filter(record => new SpotTradeStatusDomain(record.status).isOpen).length
    const rows = this.records
      .filter(record => this.filter.status === 'all' || record.status === this.filter.status)
      .filter(record => this.filter.source === 'all'
        || (this.filter.source === 'linked') === (record.tradingStrategyId !== null))
      .filter(record => this.filter.market === 'all' || record.market === this.filter.market)
      .filter(record => this.filter.symbol === '' || record.symbol === this.filter.symbol)
      .map(record => new SpotTradeRecordSummaryDomain(record).toRowDto())
    const matchingMessage = rows.length === 0 ? NO_MATCHING_TRADES_MESSAGE : null

    return new SpotTradeListDto(
      statisticsDomain.periodLabel,
      new LocalizedTextVo(
        `已平倉 ${closedTradeCount} 筆・持有中 ${openTradeCount} 筆`,
        `${closedTradeCount} closed · ${openTradeCount} open`),
      marketDomains
        .filter(market => market.closedTradeCount > 0)
        .map(market => new SpotTradeMarketSummaryDto(market.market, market.marketLabel, market.summaryFigures())),
      rows,
      this.records.filter(record => new SpotTradeStatusDomain(record.status).awaitsReview).length,
      [...new Set(this.records.map(record => record.symbol))].sort(),
      this.records.length === 0 ? NO_TRADES_MESSAGE : matchingMessage,
    )
  }
}
