import type { ContractTradeRecord } from '~/domain/models/entities/contract-trade-record'
import type { ContractTradeRecordPage } from '~/domain/models/entities/contract-trade-record-page'
import type { ContractTradeStatistics } from '~/domain/models/entities/contract-trade-statistics'
import type { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import type { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import type { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import type { ContractTradePlanWriteDto } from '~/domain/models/dto/contract-trade-plan-write-dto'
import type { ContractTradeReviewWriteDto } from '~/domain/models/dto/contract-trade-review-write-dto'
import type { ContractTradeListQueryDto } from '~/domain/models/dto/contract-trade-list-query-dto'
import type { ContractTradeStatisticsPeriod } from '~/domain/models/vo/contract-trade-statistics-period-vo'

export interface IContractTradeRecordProxy {
  recordTrade(writeDto: ContractTradeRecordWriteDto): Promise<ContractTradeRecord>
  listTrades(queryDto: ContractTradeListQueryDto): Promise<ContractTradeRecordPage>
  findTrade(id: number): Promise<ContractTradeRecord>
  deleteTrade(id: number): Promise<void>
  addFill(id: number, fillWriteDto: ContractTradeFillWriteDto): Promise<ContractTradeRecord>
  amendFill(id: number, fillId: number, fillWriteDto: ContractTradeFillWriteDto): Promise<ContractTradeRecord>
  removeFill(id: number, fillId: number): Promise<ContractTradeRecord>
  amendPlan(id: number, planWriteDto: ContractTradePlanWriteDto): Promise<ContractTradeRecord>
  addNote(id: number, content: string): Promise<ContractTradeRecord>
  writeReview(id: number, reviewWriteDto: ContractTradeReviewWriteDto): Promise<ContractTradeRecord>
  assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<ContractTradeRecord>
  findStatistics(period: ContractTradeStatisticsPeriod): Promise<ContractTradeStatistics>
  findJournalLink(identifier: string): Promise<ContractTradePrefill>
}
