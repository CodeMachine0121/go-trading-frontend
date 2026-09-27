import type { ContractTradeRecord } from '~/domain/models/entities/contract-trade-record'
import type { ContractTradeRecordPage } from '~/domain/models/entities/contract-trade-record-page'
import type { ContractTradeStatistics } from '~/domain/models/entities/contract-trade-statistics'
import type { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import type { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import type { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import type { TradePlanWriteDto } from '~/domain/models/dto/trade-plan-write-dto'
import type { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import type { ContractTradeListQueryDto } from '~/domain/models/dto/contract-trade-list-query-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'

export interface IContractTradeRecordProxy {
  recordTrade(writeDto: ContractTradeRecordWriteDto): Promise<ContractTradeRecord>
  listTrades(queryDto: ContractTradeListQueryDto): Promise<ContractTradeRecordPage>
  findTrade(id: number): Promise<ContractTradeRecord>
  deleteTrade(id: number): Promise<void>
  addFill(id: number, fillWriteDto: ContractTradeFillWriteDto): Promise<ContractTradeRecord>
  amendFill(id: number, fillId: number, fillWriteDto: ContractTradeFillWriteDto): Promise<ContractTradeRecord>
  removeFill(id: number, fillId: number): Promise<ContractTradeRecord>
  amendPlan(id: number, planWriteDto: TradePlanWriteDto): Promise<ContractTradeRecord>
  addNote(id: number, content: string): Promise<ContractTradeRecord>
  writeReview(id: number, reviewWriteDto: TradeReviewWriteDto): Promise<ContractTradeRecord>
  assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<ContractTradeRecord>
  findStatistics(period: TradeStatisticsPeriod): Promise<ContractTradeStatistics>
  findJournalLink(identifier: string): Promise<ContractTradePrefill>
}
