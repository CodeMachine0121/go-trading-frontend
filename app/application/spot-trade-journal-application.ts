import type { SpotTradeJournalService } from '~/domain/service/spot-trade-journal-service'
import type { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import type { SpotTradeListDto } from '~/domain/models/dto/spot-trade-list-dto'
import type { SpotTradeListFilterDto } from '~/domain/models/dto/spot-trade-list-filter-dto'
import type { SpotTradeDraftDto } from '~/domain/models/dto/spot-trade-draft-dto'
import type { SpotTradeDraftPreviewDto } from '~/domain/models/dto/spot-trade-draft-preview-dto'
import type { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'
import type { SpotTradeFillAmendmentDto } from '~/domain/models/dto/spot-trade-fill-amendment-dto'
import type { SpotTradePrefillDto } from '~/domain/models/dto/spot-trade-prefill-dto'
import type { SpotTradeStatisticsDto } from '~/domain/models/dto/spot-trade-statistics-dto'
import type { SpotTradeLiveComparisonDto } from '~/domain/models/dto/spot-trade-live-comparison-dto'
import type { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import type { TradePlanInputDto } from '~/domain/models/dto/trade-plan-input-dto'
import type { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import type { TradeFailureDto } from '~/domain/models/dto/trade-failure-dto'
import type { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'

export class SpotTradeJournalApplication {
  constructor(private readonly spotTradeJournalService: SpotTradeJournalService) {}

  async listTrades(filter: SpotTradeListFilterDto): Promise<SpotTradeListDto> {
    return this.spotTradeJournalService.listTrades(filter)
  }

  async getTrade(id: number): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.getTrade(id)
  }

  previewDraft(draft: SpotTradeDraftDto, existingFills: readonly SpotTradeFillDto[] | null = null): SpotTradeDraftPreviewDto {
    return this.spotTradeJournalService.previewDraft(draft, existingFills)
  }

  prefilledDraftFields(draft: SpotTradeDraftDto, prefill: SpotTradePrefillDto): TradeFormField[] {
    return this.spotTradeJournalService.prefilledDraftFields(draft, prefill)
  }

  draftDiffers(draft: SpotTradeDraftDto, initialDraft: SpotTradeDraftDto): boolean {
    return this.spotTradeJournalService.draftDiffers(draft, initialDraft)
  }

  submittedDraftFillPositions(draft: SpotTradeDraftDto, forNewTrade: boolean): number[] {
    return this.spotTradeJournalService.submittedDraftFillPositions(draft, forNewTrade)
  }

  async recordDraft(draft: SpotTradeDraftDto): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.recordDraft(draft)
  }

  async addDraftFills(id: number, draft: SpotTradeDraftDto, existingFills: readonly SpotTradeFillDto[]): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.addDraftFills(id, draft, existingFills)
  }

  async amendFill(id: number, amendment: SpotTradeFillAmendmentDto): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.amendFill(id, amendment)
  }

  async removeFill(id: number, fillId: number): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.removeFill(id, fillId)
  }

  async amendPlan(id: number, planInput: TradePlanInputDto): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.amendPlan(id, planInput)
  }

  async addNote(id: number, content: string): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.addNote(id, content)
  }

  async writeReview(id: number, reviewWriteDto: TradeReviewWriteDto): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.writeReview(id, reviewWriteDto)
  }

  async assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<SpotTradeRecordDto> {
    return this.spotTradeJournalService.assignSetupTags(id, setupTagIds)
  }

  async deleteTrade(id: number): Promise<void> {
    await this.spotTradeJournalService.deleteTrade(id)
  }

  async openJournalLink(identifier: string): Promise<SpotTradePrefillDto> {
    return this.spotTradeJournalService.openJournalLink(identifier)
  }

  listStatisticsPeriods(): JournalOptionDto[] {
    return this.spotTradeJournalService.listStatisticsPeriods()
  }

  async getStatistics(period: TradeStatisticsPeriod): Promise<SpotTradeStatisticsDto> {
    return this.spotTradeJournalService.getStatistics(period)
  }

  async getLiveComparison(tradingStrategyId: number): Promise<SpotTradeLiveComparisonDto> {
    return this.spotTradeJournalService.getLiveComparison(tradingStrategyId)
  }

  describeFailure(error: unknown): TradeFailureDto {
    return this.spotTradeJournalService.describeFailure(error)
  }

  async getPricePath(record: SpotTradeRecordDto): Promise<TradePricePathDto> {
    return this.spotTradeJournalService.getPricePath(record)
  }
}
