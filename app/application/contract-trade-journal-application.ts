import type { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { ContractTradeListDto } from '~/domain/models/dto/contract-trade-list-dto'
import type { ContractTradeListFilterDto } from '~/domain/models/dto/contract-trade-list-filter-dto'
import type { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import type { ContractTradeDraftPreviewDto } from '~/domain/models/dto/contract-trade-draft-preview-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import type { ContractTradeFillAmendmentDto } from '~/domain/models/dto/contract-trade-fill-amendment-dto'
import type { TradePlanInputDto } from '~/domain/models/dto/trade-plan-input-dto'
import type { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import type { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import type { ContractTradeStatisticsDto } from '~/domain/models/dto/contract-trade-statistics-dto'
import type { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import type { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import type { TradeFailureDto } from '~/domain/models/dto/trade-failure-dto'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'

export class ContractTradeJournalApplication {
  constructor(private readonly contractTradeJournalService: ContractTradeJournalService) {}

  async listTrades(filter: ContractTradeListFilterDto): Promise<ContractTradeListDto> {
    return this.contractTradeJournalService.listTrades(filter)
  }

  async getTrade(id: number): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.getTrade(id)
  }

  previewDraft(
    draft: ContractTradeDraftDto,
    setting: TradeJournalSettingDto,
    existingFills: readonly ContractTradeFillDto[] | null = null,
  ): ContractTradeDraftPreviewDto {
    return this.contractTradeJournalService.previewDraft(draft, setting, existingFills)
  }

  prefilledDraftFields(
    draft: ContractTradeDraftDto,
    setting: TradeJournalSettingDto,
    prefill: ContractTradePrefillDto,
  ): TradeFormField[] {
    return this.contractTradeJournalService.prefilledDraftFields(draft, setting, prefill)
  }

  draftDiffers(draft: ContractTradeDraftDto, initialDraft: ContractTradeDraftDto, setting: TradeJournalSettingDto): boolean {
    return this.contractTradeJournalService.draftDiffers(draft, initialDraft, setting)
  }

  submittedDraftFillPositions(draft: ContractTradeDraftDto, setting: TradeJournalSettingDto, forNewTrade: boolean): number[] {
    return this.contractTradeJournalService.submittedDraftFillPositions(draft, setting, forNewTrade)
  }

  async recordDraft(draft: ContractTradeDraftDto, setting: TradeJournalSettingDto): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.recordDraft(draft, setting)
  }

  async addDraftFills(
    id: number,
    draft: ContractTradeDraftDto,
    setting: TradeJournalSettingDto,
    existingFills: readonly ContractTradeFillDto[],
  ): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.addDraftFills(id, draft, setting, existingFills)
  }

  async amendFill(id: number, amendment: ContractTradeFillAmendmentDto): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.amendFill(id, amendment)
  }

  async removeFill(id: number, fillId: number): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.removeFill(id, fillId)
  }

  async amendPlan(id: number, planInput: TradePlanInputDto): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.amendPlan(id, planInput)
  }

  async addNote(id: number, content: string): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.addNote(id, content)
  }

  async writeReview(id: number, reviewWriteDto: TradeReviewWriteDto): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.writeReview(id, reviewWriteDto)
  }

  async assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<ContractTradeRecordDto> {
    return this.contractTradeJournalService.assignSetupTags(id, setupTagIds)
  }

  async deleteTrade(id: number): Promise<void> {
    await this.contractTradeJournalService.deleteTrade(id)
  }

  async openJournalLink(identifier: string): Promise<ContractTradePrefillDto> {
    return this.contractTradeJournalService.openJournalLink(identifier)
  }

  listStatisticsPeriods(): JournalOptionDto[] {
    return this.contractTradeJournalService.listStatisticsPeriods()
  }

  async getStatistics(period: TradeStatisticsPeriod): Promise<ContractTradeStatisticsDto> {
    return this.contractTradeJournalService.getStatistics(period)
  }

  async getLiveComparison(tradingStrategyId: number): Promise<ContractTradeLiveComparisonDto> {
    return this.contractTradeJournalService.getLiveComparison(tradingStrategyId)
  }

  describeFailure(error: unknown): TradeFailureDto {
    return this.contractTradeJournalService.describeFailure(error)
  }

  async getPricePath(record: ContractTradeRecordDto): Promise<TradePricePathDto> {
    return this.contractTradeJournalService.getPricePath(record)
  }
}
