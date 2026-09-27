import Decimal from 'decimal.js'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import { ContractTradeRecord } from '~/domain/models/entities/contract-trade-record'
import { ContractTradeRecordPage } from '~/domain/models/entities/contract-trade-record-page'
import { ContractTradeRecordSummary } from '~/domain/models/entities/contract-trade-record-summary'
import { ContractTradeFill } from '~/domain/models/entities/contract-trade-fill'
import { ContractTradeNote } from '~/domain/models/entities/contract-trade-note'
import { ContractTradeSource } from '~/domain/models/entities/contract-trade-source'
import { ContractTradeReview } from '~/domain/models/entities/contract-trade-review'
import { ContractTradeOutcome } from '~/domain/models/entities/contract-trade-outcome'
import { ContractTradeMeasure } from '~/domain/models/entities/contract-trade-measure'
import { ContractTradeStatistics } from '~/domain/models/entities/contract-trade-statistics'
import { ContractTradeCumulativePoint } from '~/domain/models/entities/contract-trade-cumulative-point'
import { ContractTradeDistributionBucket } from '~/domain/models/entities/contract-trade-distribution-bucket'
import { ContractTradeMistakeCost } from '~/domain/models/entities/contract-trade-mistake-cost'
import { ContractTradeSourceGroup } from '~/domain/models/entities/contract-trade-source-group'
import { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import type { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import type { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import type { ContractTradePlanWriteDto } from '~/domain/models/dto/contract-trade-plan-write-dto'
import type { ContractTradeReviewWriteDto } from '~/domain/models/dto/contract-trade-review-write-dto'
import type { ContractTradeListQueryDto } from '~/domain/models/dto/contract-trade-list-query-dto'
import type { ContractTradeStatisticsPeriod } from '~/domain/models/vo/contract-trade-statistics-period-vo'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradeStatus } from '~/domain/models/vo/contract-trade-status-vo'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import type { ContractTradeUnavailableReason } from '~/domain/models/vo/contract-trade-unavailable-reason-vo'
import type { ContractTradePrefillMode } from '~/domain/models/vo/contract-trade-prefill-mode-vo'
import { ContractTradeFormFieldVo } from '~/domain/models/vo/contract-trade-form-field-vo'
import type { ContractTradeFormField } from '~/domain/models/vo/contract-trade-form-field-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { ContractTradeNotFoundError } from '~/domain/errors/contract-trade-not-found-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { ContractTradeOpenPositionExistsError } from '~/domain/errors/contract-trade-open-position-exists-error'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import type { BackendRequestBody, BackendRequestValue } from '~/infrastructure/proxy/backend-api-proxy'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const CONTRACT_TRADE_RECORDS_ENDPOINT = '/contract-trade-records'
const BAD_REQUEST_STATUS = 400
const NOT_FOUND_STATUS = 404
const CONFLICT_STATUS = 409

const FIELD_OF_BACKEND_FIELD: Readonly<Record<string, ContractTradeFormField>> = {
  symbol: 'symbol',
  direction: 'direction',
  leverage: 'leverage',
  price: 'fillPrice',
  quantity: 'fillQuantity',
  filledAt: 'fillTime',
  fee: 'fillFee',
  plannedStopLossPrice: 'plannedStopLossPrice',
  plannedTakeProfitPrice: 'plannedTakeProfitPrice',
  confidence: 'confidence',
  tradingStrategyId: 'tradingStrategy',
  executionScore: 'executionScore',
}

const FIELD_OF_MESSAGE_HINT: readonly (readonly [string, ContractTradeFormField])[] = [
  ['超過目前持倉', 'exitQuantity'],
  ['止損', 'plannedStopLossPrice'],
  ['止盈', 'plannedTakeProfitPrice'],
  ['槓桿', 'leverage'],
  ['合約標的', 'symbol'],
  ['成交時間', 'fillTime'],
  ['出場不能早於', 'fillTime'],
  ['成交價', 'fillPrice'],
  ['數量', 'fillQuantity'],
  ['信心', 'confidence'],
  ['評分', 'executionScore'],
  ['交易策略', 'tradingStrategy'],
]

type TradeTagWire = { id: number, kind: string, name: string }

type ContractTradeFillWire = {
  id: number
  kind: string
  filledAt: string
  price: string
  quantity: string
  liquidity: string
  fee: string
  feeRateMissing?: boolean
}

type ContractTradeOutcomeWire = {
  grossProfit: string
  totalFee: string
  feeRateMissing?: boolean
  funding?: { available: boolean, amount?: string | null, settlementCount?: number, unavailableReason?: string | null }
  netProfit: string
  netProfitExcludesFunding?: boolean
  plannedRisk?: string | null
  rMultiple?: string | null
  rMultipleUnavailableReason?: string | null
  excursion?: {
    available: boolean
    adversePrice?: string | null
    favorablePrice?: string | null
    adverseRMultiple?: string | null
    favorableRMultiple?: string | null
    unavailableReason?: string | null
  }
  profitCaptureRate?: string | null
  floatingProfit?: { available: boolean, amount?: string | null, unavailableReason?: string | null }
  liquidationPrice?: { available: boolean, price?: string | null, cannotBeLiquidated?: boolean, unavailableReason?: string | null }
  entrySlippagePercentage?: string | null
}

type ContractTradeRecordWire = {
  id: number
  symbol: string
  direction: string
  leverage: string
  status: string
  plan?: {
    plannedStopLossPrice?: string | null
    plannedTakeProfitPrice?: string | null
    entryReason?: string
    confidence?: number | null
  }
  fills?: ContractTradeFillWire[]
  notes?: { id: number, content: string, createdAt: string }[]
  setupTags?: TradeTagWire[]
  mistakeTags?: TradeTagWire[]
  tradingStrategyId?: number | null
  tradingStrategyName?: string | null
  tradingStrategyDeleted?: boolean
  source?: {
    strategyBotName: string
    runNumber: number
    referencePrice?: string | null
    suggestedStopLossPrice?: string | null
    suggestedTakeProfitPrice?: string | null
  } | null
  review?: {
    wentWell?: string
    wentWrong?: string
    nextTime?: string
    executionScore: number
    reviewedAt: string
  } | null
  openedAt: string
  closedAt?: string | null
  averageEntryPrice: string
  averageExitPrice?: string | null
  position: string
  outcome: ContractTradeOutcomeWire
}

type SourceGroupWire = { tradeCount: number, winRate?: number | null, averageRMultiple?: string | null }

type ContractTradeStatisticsWire = {
  period: string
  closedTradeCount: number
  winCount?: number
  netProfit: string
  winRate?: number | null
  averageRMultiple?: string | null
  profitFactor?: string | null
  feeToGrossProfitRatio?: number | null
  averageEntrySlippagePercentage?: string | null
  entrySlippageTradeCount?: number
  rExcludedCount?: number
  cumulativeR?: { closedAt: string, cumulativeRMultiple: string }[]
  rDistribution?: { label: string, count: number }[]
  mistakeCosts?: { name: string, tradeCount: number, totalRMultiple: string }[]
  withTradingStrategy?: SourceGroupWire
  selfJudged?: SourceGroupWire
}

type ContractTradePrefillWire = {
  mode: string
  targetTradeId?: number | null
  strategyBotName: string
  runNumber: number
  ranAt: string
  symbol: string
  direction: string
  leverage: string
  plannedStopLossPrice?: string | null
  plannedTakeProfitPrice?: string | null
  tradingStrategyId?: number | null
  entryPrice?: string | null
  quantity?: string | null
}

const EXCURSION_REASONS: Readonly<Record<string, ContractTradeUnavailableReason>> = {
  noMarketData: 'noMarketData',
}

const FLOATING_PROFIT_REASONS: Readonly<Record<string, ContractTradeUnavailableReason>> = {
  notOpen: 'notApplicable',
  noLatestPrice: 'noLatestPrice',
}

const LIQUIDATION_REASONS: Readonly<Record<string, ContractTradeUnavailableReason>> = {
  notOpen: 'notApplicable',
  noTradingSpecification: 'noTradingSpecification',
}

export class ContractTradeRecordProxy extends BackendApiProxy implements IContractTradeRecordProxy {
  async recordTrade(writeDto: ContractTradeRecordWriteDto): Promise<ContractTradeRecord> {
    const body: BackendRequestBody = {
      symbol: writeDto.symbol,
      direction: writeDto.direction,
      ...(writeDto.leverage === null ? {} : { leverage: writeDto.leverage.toString() }),
      firstEntryFill: this.toFillBody(writeDto.firstEntryFill),
      plan: {
        plannedStopLossPrice: writeDto.plannedStopLossPrice?.toString() ?? null,
        plannedTakeProfitPrice: writeDto.plannedTakeProfitPrice?.toString() ?? null,
        entryReason: writeDto.entryReason,
        confidence: writeDto.confidence,
      },
      tradingStrategyId: writeDto.tradingStrategyId,
      setupTagIds: [...writeDto.setupTagIds],
      ...(writeDto.journalLinkIdentifier === null ? {} : { journalLinkIdentifier: writeDto.journalLinkIdentifier }),
    }

    return this.requestRecord(CONTRACT_TRADE_RECORDS_ENDPOINT, 'POST', body)
  }

  async listTrades(queryDto: ContractTradeListQueryDto): Promise<ContractTradeRecordPage> {
    const query: Record<string, string> = {
      ...(queryDto.status === null ? {} : { status: queryDto.status }),
      ...(queryDto.symbol === null ? {} : { symbol: queryDto.symbol }),
      ...(queryDto.limit === null ? {} : { limit: String(queryDto.limit) }),
    }
    const pageWire = await this.requestBackend<{ totalCount?: number, trades?: ContractTradeRecordWire[] }>(
      CONTRACT_TRADE_RECORDS_ENDPOINT, { query })

    return new ContractTradeRecordPage(
      (pageWire.trades ?? []).map((tradeWire) => {
        const record = this.toRecord(tradeWire)

        return new ContractTradeRecordSummary(
          record.id,
          record.symbol,
          record.direction,
          record.leverage,
          record.status,
          record.tradingStrategyId,
          record.tradingStrategyName,
          record.tradingStrategyDeleted,
          record.outcome.averageEntryPrice,
          record.outcome.averageExitPrice,
          record.status === 'open' ? null : record.outcome.netProfit,
          record.outcome.floatingProfit,
          record.outcome.rMultiple,
          record.tags,
          record.openedAt,
          record.closedAt,
          record.source,
        )
      }),
      pageWire.totalCount ?? 0,
    )
  }

  async findTrade(id: number): Promise<ContractTradeRecord> {
    return this.requestRecord(`${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}`, 'GET')
  }

  async deleteTrade(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.recordFailureOf(error)
    }
  }

  async addFill(id: number, fillWriteDto: ContractTradeFillWriteDto): Promise<ContractTradeRecord> {
    return this.requestRecord(
      `${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/fills`, 'POST', this.toFillBody(fillWriteDto))
  }

  async amendFill(id: number, fillId: number, fillWriteDto: ContractTradeFillWriteDto): Promise<ContractTradeRecord> {
    return this.requestRecord(
      `${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/fills/${fillId}`, 'PUT', this.toFillBody(fillWriteDto))
  }

  async removeFill(id: number, fillId: number): Promise<ContractTradeRecord> {
    return this.requestRecord(`${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/fills/${fillId}`, 'DELETE')
  }

  async amendPlan(id: number, planWriteDto: ContractTradePlanWriteDto): Promise<ContractTradeRecord> {
    return this.requestRecord(`${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/plan`, 'PUT', {
      plannedStopLossPrice: planWriteDto.plannedStopLossPrice?.toString() ?? null,
      plannedTakeProfitPrice: planWriteDto.plannedTakeProfitPrice?.toString() ?? null,
      entryReason: planWriteDto.entryReason,
      confidence: planWriteDto.confidence,
    })
  }

  async addNote(id: number, content: string): Promise<ContractTradeRecord> {
    return this.requestRecord(`${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/notes`, 'POST', { content })
  }

  async writeReview(id: number, reviewWriteDto: ContractTradeReviewWriteDto): Promise<ContractTradeRecord> {
    return this.requestRecord(`${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/review`, 'PUT', {
      wentWell: reviewWriteDto.wentWell,
      wentWrong: reviewWriteDto.wentWrong,
      nextTime: reviewWriteDto.nextTime,
      executionScore: reviewWriteDto.executionScore,
      mistakeTagIds: [...reviewWriteDto.mistakeTagIds],
    })
  }

  async assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<ContractTradeRecord> {
    return this.requestRecord(
      `${CONTRACT_TRADE_RECORDS_ENDPOINT}/${id}/setup-tags`, 'PUT', { setupTagIds: [...setupTagIds] })
  }

  async findStatistics(period: ContractTradeStatisticsPeriod): Promise<ContractTradeStatistics> {
    const statisticsWire = await this.requestBackend<ContractTradeStatisticsWire>(
      `${CONTRACT_TRADE_RECORDS_ENDPOINT}/statistics`, { query: { period } })

    return new ContractTradeStatistics(
      (statisticsWire.period || period) as ContractTradeStatisticsPeriod,
      statisticsWire.closedTradeCount,
      statisticsWire.winCount ?? 0,
      new Decimal(statisticsWire.netProfit ?? 0),
      statisticsWire.winRate ?? null,
      this.decimalOrNull(statisticsWire.averageRMultiple),
      this.decimalOrNull(statisticsWire.profitFactor),
      statisticsWire.feeToGrossProfitRatio ?? null,
      this.decimalOrNull(statisticsWire.averageEntrySlippagePercentage),
      statisticsWire.entrySlippageTradeCount ?? 0,
      statisticsWire.rExcludedCount ?? 0,
      (statisticsWire.cumulativeR ?? []).map(pointWire => new ContractTradeCumulativePoint(
        new Date(pointWire.closedAt), new Decimal(pointWire.cumulativeRMultiple))),
      (statisticsWire.rDistribution ?? []).map(bucketWire => new ContractTradeDistributionBucket(
        bucketWire.label, bucketWire.count, !/^\D*[-−]/.test(bucketWire.label))),
      (statisticsWire.mistakeCosts ?? []).map(mistakeCostWire => new ContractTradeMistakeCost(
        mistakeCostWire.name, mistakeCostWire.tradeCount, new Decimal(mistakeCostWire.totalRMultiple))),
      this.toSourceGroup(statisticsWire.withTradingStrategy),
      this.toSourceGroup(statisticsWire.selfJudged),
    )
  }

  async findJournalLink(identifier: string): Promise<ContractTradePrefill> {
    try {
      const prefillWire = await this.requestBackend<ContractTradePrefillWire>(
        `${CONTRACT_TRADE_RECORDS_ENDPOINT}/journal-links/${encodeURIComponent(identifier)}`)

      return new ContractTradePrefill(
        identifier,
        prefillWire.mode as ContractTradePrefillMode,
        prefillWire.targetTradeId ?? null,
        prefillWire.strategyBotName,
        prefillWire.runNumber,
        new Date(prefillWire.ranAt),
        prefillWire.symbol,
        prefillWire.direction as ContractTradeDirection,
        new Decimal(prefillWire.leverage),
        this.decimalOrNull(prefillWire.plannedStopLossPrice),
        this.decimalOrNull(prefillWire.plannedTakeProfitPrice),
        prefillWire.tradingStrategyId ?? null,
        null,
        this.decimalOrNull(prefillWire.entryPrice),
        this.decimalOrNull(prefillWire.quantity),
      )
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError && error.status === NOT_FOUND_STATUS) {
        throw new JournalLinkNotFoundError(error.message, { cause: error })
      }

      throw error
    }
  }

  private async requestRecord(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: BackendRequestBody,
  ): Promise<ContractTradeRecord> {
    try {
      return this.toRecord(await this.requestBackend<ContractTradeRecordWire>(path, { method, body }))
    }
    catch (error: unknown) {
      throw this.recordFailureOf(error)
    }
  }

  private recordFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NOT_FOUND_STATUS) {
      return new ContractTradeNotFoundError(error.message, { cause: error })
    }

    if (error.status === CONFLICT_STATUS) {
      const mentionedTradeNumber = /#(\d+)/.exec(error.message)?.[1]
      const mentionedTradeId = mentionedTradeNumber === undefined ? null : Number(mentionedTradeNumber)

      return new ContractTradeOpenPositionExistsError(
        error.message, error.openTradeId ?? mentionedTradeId, { cause: error })
    }

    if (error.status === BAD_REQUEST_STATUS) {
      const fieldFromBackend = error.field === undefined ? undefined : FIELD_OF_BACKEND_FIELD[error.field]
      const fieldFromMessage = FIELD_OF_MESSAGE_HINT.find(([hint]) => error.message.includes(hint))?.[1]
      const formField = fieldFromBackend ?? fieldFromMessage

      return new ContractTradeRejectedError(
        error.message,
        formField === undefined ? null : new ContractTradeFormFieldVo(formField),
        null,
        { cause: error })
    }

    return error
  }

  private toFillBody(fillWriteDto: ContractTradeFillWriteDto): { readonly [key: string]: BackendRequestValue } {
    return {
      kind: fillWriteDto.kind,
      ...(fillWriteDto.filledAt === null ? {} : { filledAt: fillWriteDto.filledAt.toISOString() }),
      price: fillWriteDto.price.toString(),
      quantity: fillWriteDto.quantity.toString(),
      liquidity: fillWriteDto.liquidity,
      ...(fillWriteDto.fee === null ? {} : { fee: fillWriteDto.fee.toString() }),
    }
  }

  private toRecord(recordWire: ContractTradeRecordWire): ContractTradeRecord {
    const outcomeWire = recordWire.outcome
    const sourceWire = recordWire.source ?? null
    const reviewWire = recordWire.review ?? null
    const excursion = outcomeWire.excursion ?? { available: false }
    const excursionReason = EXCURSION_REASONS[excursion.unavailableReason ?? ''] ?? 'temporarilyUnavailable'
    const floatingProfit = outcomeWire.floatingProfit ?? { available: false }
    const liquidation = outcomeWire.liquidationPrice ?? { available: false }
    const funding = outcomeWire.funding ?? { available: false }
    const liquidationReason = liquidation.cannotBeLiquidated
      ? 'notApplicable'
      : LIQUIDATION_REASONS[liquidation.unavailableReason ?? ''] ?? 'temporarilyUnavailable'

    return new ContractTradeRecord(
      recordWire.id,
      recordWire.symbol,
      recordWire.direction as ContractTradeDirection,
      new Decimal(recordWire.leverage),
      recordWire.status as ContractTradeStatus,
      this.decimalOrNull(recordWire.plan?.plannedStopLossPrice),
      this.decimalOrNull(recordWire.plan?.plannedTakeProfitPrice),
      recordWire.plan?.entryReason ?? '',
      recordWire.plan?.confidence ?? null,
      recordWire.tradingStrategyId ?? null,
      recordWire.tradingStrategyName ?? null,
      recordWire.tradingStrategyDeleted ?? false,
      new Date(recordWire.openedAt),
      this.dateOrNull(recordWire.closedAt),
      (recordWire.fills ?? []).map(fillWire => new ContractTradeFill(
        fillWire.id,
        fillWire.kind as ContractTradeFillKind,
        new Date(fillWire.filledAt),
        new Decimal(fillWire.price),
        new Decimal(fillWire.quantity),
        fillWire.liquidity as TradeFillLiquidity,
        new Decimal(fillWire.fee),
        fillWire.feeRateMissing ?? false,
      )),
      (recordWire.notes ?? []).map(noteWire => new ContractTradeNote(
        noteWire.id, noteWire.content, new Date(noteWire.createdAt))),
      [...(recordWire.setupTags ?? []), ...(recordWire.mistakeTags ?? [])].map(tagWire => new TradeTag(
        tagWire.id, tagWire.kind as TradeTagKind, tagWire.name)),
      sourceWire === null
        ? null
        : new ContractTradeSource(
            sourceWire.strategyBotName,
            sourceWire.runNumber,
            this.decimalOrNull(sourceWire.referencePrice),
            this.decimalOrNull(sourceWire.suggestedStopLossPrice),
            this.decimalOrNull(sourceWire.suggestedTakeProfitPrice),
          ),
      reviewWire === null
        ? null
        : new ContractTradeReview(
            reviewWire.wentWell ?? '',
            reviewWire.wentWrong ?? '',
            reviewWire.nextTime ?? '',
            reviewWire.executionScore,
            new Date(reviewWire.reviewedAt),
          ),
      new ContractTradeOutcome(
        new Decimal(recordWire.position),
        new Decimal(recordWire.averageEntryPrice),
        this.decimalOrNull(recordWire.averageExitPrice),
        new Decimal(outcomeWire.grossProfit),
        new Decimal(outcomeWire.totalFee),
        outcomeWire.feeRateMissing ?? false,
        this.toMeasure(
          funding.available ? funding.amount : null,
          funding.unavailableReason === 'noSettlementData' ? 'noFundingSettlements' : 'temporarilyUnavailable'),
        new Decimal(outcomeWire.netProfit),
        outcomeWire.netProfitExcludesFunding ?? false,
        this.toMeasure(outcomeWire.plannedRisk, 'noStopLoss'),
        this.toMeasure(
          outcomeWire.rMultiple,
          outcomeWire.rMultipleUnavailableReason === 'noStopLoss' ? 'noStopLoss' : 'temporarilyUnavailable'),
        this.toMeasure(excursion.adverseRMultiple, excursion.available ? 'noStopLoss' : excursionReason),
        this.toMeasure(excursion.favorableRMultiple, excursion.available ? 'noStopLoss' : excursionReason),
        this.decimalOrNull(excursion.adversePrice),
        this.decimalOrNull(excursion.favorablePrice),
        this.toMeasure(outcomeWire.profitCaptureRate, excursion.available ? 'notApplicable' : excursionReason),
        this.toMeasure(
          floatingProfit.available ? floatingProfit.amount : null,
          FLOATING_PROFIT_REASONS[floatingProfit.unavailableReason ?? ''] ?? 'temporarilyUnavailable'),
        this.toMeasure(liquidation.available ? liquidation.price : null, liquidationReason),
        this.toMeasure(outcomeWire.entrySlippagePercentage, 'notApplicable'),
      ),
    )
  }

  private toSourceGroup(sourceGroupWire: SourceGroupWire | undefined): ContractTradeSourceGroup {
    return new ContractTradeSourceGroup(
      sourceGroupWire?.tradeCount ?? 0,
      sourceGroupWire?.winRate ?? null,
      this.decimalOrNull(sourceGroupWire?.averageRMultiple),
    )
  }

  private toMeasure(text: string | null | undefined, unavailableReason: ContractTradeUnavailableReason): ContractTradeMeasure {
    const value = this.decimalOrNull(text)

    return new ContractTradeMeasure(value, value === null ? unavailableReason : null)
  }

  private decimalOrNull(text: string | null | undefined): Decimal | null {
    return text === undefined || text === null || text === '' ? null : new Decimal(text)
  }

  private dateOrNull(text: string | null | undefined): Date | null {
    return text === undefined || text === null || text === '' ? null : new Date(text)
  }
}
