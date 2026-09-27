import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
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
import { DEFAULT_TRADE_STATISTICS_PERIOD, TRADE_STATISTICS_PERIODS } from '~/domain/models/vo/trade-statistics-period-vo'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'
import { SpotTradeListQueryDto } from '~/domain/models/dto/spot-trade-list-query-dto'
import { TradePlanWriteDto } from '~/domain/models/dto/trade-plan-write-dto'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'
import { SpotTradeDraftDomain } from '~/domain/models/domains/spot-trade-draft-domain'
import { SpotTradeListDomain } from '~/domain/models/domains/spot-trade-list-domain'
import { SpotTradeStatisticsDomain } from '~/domain/models/domains/spot-trade-statistics-domain'
import { SpotTradeLiveComparisonDomain } from '~/domain/models/domains/spot-trade-live-comparison-domain'
import { SpotTradePrefillDomain } from '~/domain/models/domains/spot-trade-prefill-domain'
import { SpotTradePricePathDomain } from '~/domain/models/domains/spot-trade-price-path-domain'
import { TradeStatisticsPeriodDomain } from '~/domain/models/domains/trade-statistics-period-domain'
import { TradeFailureDomain } from '~/domain/models/domains/trade-failure-domain'

const LIST_LIMIT = 200
const UNREADABLE_FILL_MESSAGE = '價格與數量要填數字'

export class SpotTradeJournalService {
  constructor(
    private readonly spotTradeRecordProxy: ISpotTradeRecordProxy,
    private readonly tradingStrategyProxy: ITradingStrategyProxy,
    private readonly kCandleProxy: IKCandleProxy,
  ) {}

  async listTrades(filter: SpotTradeListFilterDto): Promise<SpotTradeListDto> {
    const [page, statistics] = await Promise.all([
      this.spotTradeRecordProxy.listTrades(new SpotTradeListQueryDto(LIST_LIMIT)),
      this.spotTradeRecordProxy.findStatistics(DEFAULT_TRADE_STATISTICS_PERIOD),
    ])

    return new SpotTradeListDomain(page.records, statistics, filter).toDto()
  }

  async getTrade(id: number): Promise<SpotTradeRecordDto> {
    return (await this.spotTradeRecordProxy.findTrade(id)).toDomain().toDto()
  }

  previewDraft(draft: SpotTradeDraftDto, existingFills: readonly SpotTradeFillDto[] | null): SpotTradeDraftPreviewDto {
    return new SpotTradeDraftDomain(draft, existingFills).toPreviewDto()
  }

  prefilledDraftFields(draft: SpotTradeDraftDto, prefill: SpotTradePrefillDto): TradeFormField[] {
    return new SpotTradeDraftDomain(draft).prefilledFields(prefill)
  }

  draftDiffers(draft: SpotTradeDraftDto, initialDraft: SpotTradeDraftDto): boolean {
    return new SpotTradeDraftDomain(draft).differsFrom(initialDraft)
  }

  async recordDraft(draft: SpotTradeDraftDto): Promise<SpotTradeRecordDto> {
    const submission = new SpotTradeDraftDomain(draft).toRecordSubmission()
    const recorded = await this.spotTradeRecordProxy.recordTrade(submission.record)

    return (await this.appendFills(recorded.id, submission.additionalFills, recorded.id)) ?? recorded.toDomain().toDto()
  }

  async addDraftFills(
    id: number,
    draft: SpotTradeDraftDto,
    existingFills: readonly SpotTradeFillDto[],
  ): Promise<SpotTradeRecordDto> {
    const [firstFillWriteDto, ...otherFillWriteDtos] = new SpotTradeDraftDomain(draft, existingFills).toFillWriteDtos()
    const afterFirstFill = (await this.spotTradeRecordProxy.addFill(id, firstFillWriteDto)).toDomain().toDto()

    return (await this.appendFills(id, otherFillWriteDtos, null)) ?? afterFirstFill
  }

  async amendFill(id: number, amendment: SpotTradeFillAmendmentDto): Promise<SpotTradeRecordDto> {
    const price = new DecimalInputDomain(amendment.priceText).value
    const quantity = new DecimalInputDomain(amendment.quantityText).value
    if (price === null || quantity === null) {
      throw new TradeRejectedError(UNREADABLE_FILL_MESSAGE, new TradeFormFieldVo('fillPrice'))
    }

    const fill = amendment.fill

    return (await this.spotTradeRecordProxy.amendFill(id, fill.id, new SpotTradeFillWriteDto(
      fill.kind, fill.filledAt, price, quantity, new DecimalInputDomain(amendment.feeText).value)))
      .toDomain().toDto()
  }

  async removeFill(id: number, fillId: number): Promise<SpotTradeRecordDto> {
    return (await this.spotTradeRecordProxy.removeFill(id, fillId)).toDomain().toDto()
  }

  async amendPlan(id: number, planInput: TradePlanInputDto): Promise<SpotTradeRecordDto> {
    return (await this.spotTradeRecordProxy.amendPlan(id, new TradePlanWriteDto(
      new DecimalInputDomain(planInput.plannedStopLossText).value,
      new DecimalInputDomain(planInput.plannedTakeProfitText).value,
      planInput.entryReason,
      planInput.confidence,
    ))).toDomain().toDto()
  }

  async addNote(id: number, content: string): Promise<SpotTradeRecordDto> {
    return (await this.spotTradeRecordProxy.addNote(id, content.trim())).toDomain().toDto()
  }

  async writeReview(id: number, reviewWriteDto: TradeReviewWriteDto): Promise<SpotTradeRecordDto> {
    return (await this.spotTradeRecordProxy.writeReview(id, reviewWriteDto)).toDomain().toDto()
  }

  async assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<SpotTradeRecordDto> {
    return (await this.spotTradeRecordProxy.assignSetupTags(id, setupTagIds)).toDomain().toDto()
  }

  async deleteTrade(id: number): Promise<void> {
    await this.spotTradeRecordProxy.deleteTrade(id)
  }

  async openJournalLink(identifier: string): Promise<SpotTradePrefillDto> {
    return new SpotTradePrefillDomain(await this.spotTradeRecordProxy.findJournalLink(identifier)).toDto()
  }

  listStatisticsPeriods(): JournalOptionDto[] {
    return TRADE_STATISTICS_PERIODS.map(period => new TradeStatisticsPeriodDomain(period).toOptionDto())
  }

  async getStatistics(period: TradeStatisticsPeriod): Promise<SpotTradeStatisticsDto> {
    return new SpotTradeStatisticsDomain(await this.spotTradeRecordProxy.findStatistics(period)).toDto()
  }

  async getLiveComparison(tradingStrategyId: number): Promise<SpotTradeLiveComparisonDto> {
    return new SpotTradeLiveComparisonDomain(
      await this.tradingStrategyProxy.findSpotTradeComparison(tradingStrategyId)).toDto()
  }

  describeFailure(error: unknown): TradeFailureDto {
    return new TradeFailureDomain(error).toDto()
  }

  async getPricePath(record: SpotTradeRecordDto): Promise<TradePricePathDto> {
    const pricePath = new SpotTradePricePathDomain(record, new Date())
    const series = await this.kCandleProxy.findKCandleSeries(pricePath.toLoadPlan())

    return pricePath.toDto(series.kCandles)
  }

  private async appendFills(
    id: number,
    fillWriteDtos: readonly SpotTradeFillWriteDto[],
    recordedTradeId: number | null,
  ): Promise<SpotTradeRecordDto | null> {
    const appended: SpotTradeRecordDto[] = []
    for (const [index, fillWriteDto] of fillWriteDtos.entries()) {
      try {
        appended.push((await this.spotTradeRecordProxy.addFill(id, fillWriteDto)).toDomain().toDto())
      }
      catch (error: unknown) {
        if (recordedTradeId === null || !(error instanceof TradeRejectedError)) {
          throw error
        }

        throw new TradeRejectedError(
          `已建立 #${recordedTradeId}，但第 ${index + 2} 筆沒有存成功：${error.message}`,
          error.formField,
          recordedTradeId,
          { cause: error },
        )
      }
    }

    return appended.at(-1) ?? null
  }
}
