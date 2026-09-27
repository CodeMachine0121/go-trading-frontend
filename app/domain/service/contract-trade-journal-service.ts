import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { ContractTradeListDto } from '~/domain/models/dto/contract-trade-list-dto'
import type { ContractTradeListFilterDto } from '~/domain/models/dto/contract-trade-list-filter-dto'
import type { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import type { ContractTradeDraftPreviewDto } from '~/domain/models/dto/contract-trade-draft-preview-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { ContractTradePlanWriteDto } from '~/domain/models/dto/contract-trade-plan-write-dto'
import type { ContractTradePlanInputDto } from '~/domain/models/dto/contract-trade-plan-input-dto'
import type { ContractTradeFillAmendmentDto } from '~/domain/models/dto/contract-trade-fill-amendment-dto'
import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'
import { ContractTradeFormFieldVo } from '~/domain/models/vo/contract-trade-form-field-vo'
import type { ContractTradeReviewWriteDto } from '~/domain/models/dto/contract-trade-review-write-dto'
import type { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import type { ContractTradeStatisticsDto } from '~/domain/models/dto/contract-trade-statistics-dto'
import type { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import type { ContractTradePricePathDto } from '~/domain/models/dto/contract-trade-price-path-dto'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import { ContractTradeListQueryDto } from '~/domain/models/dto/contract-trade-list-query-dto'
import type { ContractTradeStatisticsPeriod } from '~/domain/models/vo/contract-trade-statistics-period-vo'
import {
  CONTRACT_TRADE_STATISTICS_PERIODS,
  DEFAULT_CONTRACT_TRADE_STATISTICS_PERIOD,
} from '~/domain/models/vo/contract-trade-statistics-period-vo'
import { ContractTradeDraftDomain } from '~/domain/models/domains/contract-trade-draft-domain'
import { ContractTradeListDomain } from '~/domain/models/domains/contract-trade-list-domain'
import { ContractTradeStatisticsDomain } from '~/domain/models/domains/contract-trade-statistics-domain'
import { ContractTradeStatisticsPeriodDomain } from '~/domain/models/domains/contract-trade-statistics-period-domain'
import { ContractTradeLiveComparisonDomain } from '~/domain/models/domains/contract-trade-live-comparison-domain'
import { ContractTradePrefillDomain } from '~/domain/models/domains/contract-trade-prefill-domain'
import { ContractTradePricePathDomain } from '~/domain/models/domains/contract-trade-price-path-domain'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import type { ContractTradeFailureDto } from '~/domain/models/dto/contract-trade-failure-dto'
import { ContractTradeFailureDomain } from '~/domain/models/domains/contract-trade-failure-domain'
import type { ContractTradeFormField } from '~/domain/models/vo/contract-trade-form-field-vo'

const LIST_LIMIT = 200
const UNREADABLE_FILL_MESSAGE = '成交價與數量要填數字'

export class ContractTradeJournalService {
  constructor(
    private readonly contractTradeRecordProxy: IContractTradeRecordProxy,
    private readonly tradingStrategyProxy: ITradingStrategyProxy,
    private readonly kCandleContractProxy: IKCandleContractProxy,
  ) {}

  async listTrades(filter: ContractTradeListFilterDto): Promise<ContractTradeListDto> {
    const [page, statistics] = await Promise.all([
      this.contractTradeRecordProxy.listTrades(new ContractTradeListQueryDto(null, null, LIST_LIMIT)),
      this.contractTradeRecordProxy.findStatistics(DEFAULT_CONTRACT_TRADE_STATISTICS_PERIOD),
    ])

    return new ContractTradeListDomain(page.records, statistics, filter).toDto()
  }

  async getTrade(id: number): Promise<ContractTradeRecordDto> {
    return (await this.contractTradeRecordProxy.findTrade(id)).toDomain().toDto()
  }

  previewDraft(
    draft: ContractTradeDraftDto,
    setting: TradeJournalSettingDto,
    existingFills: readonly ContractTradeFillDto[] | null,
  ): ContractTradeDraftPreviewDto {
    return new ContractTradeDraftDomain(draft, setting, existingFills).toPreviewDto()
  }

  prefilledDraftFields(
    draft: ContractTradeDraftDto,
    setting: TradeJournalSettingDto,
    prefill: ContractTradePrefillDto,
  ): ContractTradeFormField[] {
    return new ContractTradeDraftDomain(draft, setting).prefilledFields(prefill)
  }

  draftDiffers(draft: ContractTradeDraftDto, initialDraft: ContractTradeDraftDto, setting: TradeJournalSettingDto): boolean {
    return new ContractTradeDraftDomain(draft, setting).differsFrom(initialDraft)
  }

  async recordDraft(draft: ContractTradeDraftDto, setting: TradeJournalSettingDto): Promise<ContractTradeRecordDto> {
    const submission = new ContractTradeDraftDomain(draft, setting).toRecordSubmission()
    const recorded = await this.contractTradeRecordProxy.recordTrade(submission.record)

    return (await this.appendFills(recorded.id, submission.additionalFills, recorded.id))
      ?? recorded.toDomain().toDto()
  }

  async addDraftFills(
    id: number,
    draft: ContractTradeDraftDto,
    setting: TradeJournalSettingDto,
    existingFills: readonly ContractTradeFillDto[],
  ): Promise<ContractTradeRecordDto> {
    const [firstFillWriteDto, ...otherFillWriteDtos]
      = new ContractTradeDraftDomain(draft, setting, existingFills).toFillWriteDtos()
    const afterFirstFill = (await this.contractTradeRecordProxy.addFill(id, firstFillWriteDto)).toDomain().toDto()

    return (await this.appendFills(id, otherFillWriteDtos, null)) ?? afterFirstFill
  }

  async amendFill(id: number, amendment: ContractTradeFillAmendmentDto): Promise<ContractTradeRecordDto> {
    const price = new DecimalInputDomain(amendment.priceText).value
    const quantity = new DecimalInputDomain(amendment.quantityText).value
    if (price === null || quantity === null) {
      throw new ContractTradeRejectedError(UNREADABLE_FILL_MESSAGE, new ContractTradeFormFieldVo('fillPrice'))
    }

    const fill = amendment.fill

    return (await this.contractTradeRecordProxy.amendFill(id, fill.id, new ContractTradeFillWriteDto(
      fill.kind, fill.filledAt, price, quantity, fill.liquidity, new DecimalInputDomain(amendment.feeText).value)))
      .toDomain().toDto()
  }

  async removeFill(id: number, fillId: number): Promise<ContractTradeRecordDto> {
    return (await this.contractTradeRecordProxy.removeFill(id, fillId)).toDomain().toDto()
  }

  async amendPlan(id: number, planInput: ContractTradePlanInputDto): Promise<ContractTradeRecordDto> {
    return (await this.contractTradeRecordProxy.amendPlan(id, new ContractTradePlanWriteDto(
      new DecimalInputDomain(planInput.plannedStopLossText).value,
      new DecimalInputDomain(planInput.plannedTakeProfitText).value,
      planInput.entryReason,
      planInput.confidence,
    ))).toDomain().toDto()
  }

  async addNote(id: number, content: string): Promise<ContractTradeRecordDto> {
    return (await this.contractTradeRecordProxy.addNote(id, content.trim())).toDomain().toDto()
  }

  async writeReview(id: number, reviewWriteDto: ContractTradeReviewWriteDto): Promise<ContractTradeRecordDto> {
    return (await this.contractTradeRecordProxy.writeReview(id, reviewWriteDto)).toDomain().toDto()
  }

  async assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<ContractTradeRecordDto> {
    return (await this.contractTradeRecordProxy.assignSetupTags(id, setupTagIds)).toDomain().toDto()
  }

  async deleteTrade(id: number): Promise<void> {
    await this.contractTradeRecordProxy.deleteTrade(id)
  }

  async openJournalLink(identifier: string): Promise<ContractTradePrefillDto> {
    return new ContractTradePrefillDomain(
      await this.contractTradeRecordProxy.findJournalLink(identifier)).toDto()
  }

  listStatisticsPeriods(): JournalOptionDto[] {
    return CONTRACT_TRADE_STATISTICS_PERIODS.map(
      period => new ContractTradeStatisticsPeriodDomain(period).toOptionDto())
  }

  async getStatistics(period: ContractTradeStatisticsPeriod): Promise<ContractTradeStatisticsDto> {
    return new ContractTradeStatisticsDomain(
      await this.contractTradeRecordProxy.findStatistics(period)).toDto()
  }

  async getLiveComparison(tradingStrategyId: number): Promise<ContractTradeLiveComparisonDto> {
    return new ContractTradeLiveComparisonDomain(
      await this.tradingStrategyProxy.findContractTradeComparison(tradingStrategyId)).toDto()
  }

  describeFailure(error: unknown): ContractTradeFailureDto {
    return new ContractTradeFailureDomain(error).toDto()
  }

  async getPricePath(record: ContractTradeRecordDto): Promise<ContractTradePricePathDto> {
    const pricePath = new ContractTradePricePathDomain(record, new Date())
    const series = await this.kCandleContractProxy.findKCandleContractSeries(pricePath.toLoadPlan())

    return pricePath.toDto(series.kCandleContracts)
  }

  private async appendFills(
    id: number,
    fillWriteDtos: readonly ContractTradeFillWriteDto[],
    recordedTradeId: number | null,
  ): Promise<ContractTradeRecordDto | null> {
    const appended: ContractTradeRecordDto[] = []
    for (const [index, fillWriteDto] of fillWriteDtos.entries()) {
      try {
        appended.push((await this.contractTradeRecordProxy.addFill(id, fillWriteDto)).toDomain().toDto())
      }
      catch (error: unknown) {
        if (recordedTradeId === null || !(error instanceof ContractTradeRejectedError)) {
          throw error
        }

        throw new ContractTradeRejectedError(
          `已建立 #${recordedTradeId}，但第 ${index + 2} 筆成交沒有存成功：${error.message}`,
          error.formField,
          recordedTradeId,
          { cause: error },
        )
      }
    }

    return appended.at(-1) ?? null
  }
}
