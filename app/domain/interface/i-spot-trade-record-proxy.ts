import type { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import type { SpotTradeRecordPage } from '~/domain/models/entities/spot-trade-record-page'
import type { SpotTradeStatistics } from '~/domain/models/entities/spot-trade-statistics'
import type { SpotTradePrefill } from '~/domain/models/entities/spot-trade-prefill'
import type { SpotTradeRecordWriteDto } from '~/domain/models/dto/spot-trade-record-write-dto'
import type { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'
import type { TradePlanWriteDto } from '~/domain/models/dto/trade-plan-write-dto'
import type { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import type { SpotTradeListQueryDto } from '~/domain/models/dto/spot-trade-list-query-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'

export interface ISpotTradeRecordProxy {
  recordTrade(writeDto: SpotTradeRecordWriteDto): Promise<SpotTradeRecord>
  listTrades(queryDto: SpotTradeListQueryDto): Promise<SpotTradeRecordPage>
  findTrade(id: number): Promise<SpotTradeRecord>
  deleteTrade(id: number): Promise<void>
  addFill(id: number, fillWriteDto: SpotTradeFillWriteDto): Promise<SpotTradeRecord>
  amendFill(id: number, fillId: number, fillWriteDto: SpotTradeFillWriteDto): Promise<SpotTradeRecord>
  removeFill(id: number, fillId: number): Promise<SpotTradeRecord>
  amendPlan(id: number, planWriteDto: TradePlanWriteDto): Promise<SpotTradeRecord>
  addNote(id: number, content: string): Promise<SpotTradeRecord>
  writeReview(id: number, reviewWriteDto: TradeReviewWriteDto): Promise<SpotTradeRecord>
  assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<SpotTradeRecord>
  findStatistics(period: TradeStatisticsPeriod): Promise<SpotTradeStatistics>
  findJournalLink(identifier: string): Promise<SpotTradePrefill>
}
