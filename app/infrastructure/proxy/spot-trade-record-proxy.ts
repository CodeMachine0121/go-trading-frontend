import Decimal from 'decimal.js'
import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import { SpotTradeRecordPage } from '~/domain/models/entities/spot-trade-record-page'
import { SpotTradeFill } from '~/domain/models/entities/spot-trade-fill'
import { SpotTradeOutcome } from '~/domain/models/entities/spot-trade-outcome'
import { SpotTradePrefill } from '~/domain/models/entities/spot-trade-prefill'
import { SpotTradeStatistics } from '~/domain/models/entities/spot-trade-statistics'
import { SpotTradeMarketStatistics } from '~/domain/models/entities/spot-trade-market-statistics'
import { SpotTradeCumulativePoint } from '~/domain/models/entities/spot-trade-cumulative-point'
import { SpotTradeDistributionBucket } from '~/domain/models/entities/spot-trade-distribution-bucket'
import { SpotTradeMistakeCost } from '~/domain/models/entities/spot-trade-mistake-cost'
import { SpotTradeSourceGroup } from '~/domain/models/entities/spot-trade-source-group'
import { TradeNote } from '~/domain/models/entities/trade-note'
import { TradeSource } from '~/domain/models/entities/trade-source'
import { TradeReview } from '~/domain/models/entities/trade-review'
import { TradeMeasure } from '~/domain/models/entities/trade-measure'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import type { SpotTradeRecordWriteDto } from '~/domain/models/dto/spot-trade-record-write-dto'
import type { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'
import type { TradePlanWriteDto } from '~/domain/models/dto/trade-plan-write-dto'
import type { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import type { SpotTradeListQueryDto } from '~/domain/models/dto/spot-trade-list-query-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { SpotTradePrefillMode } from '~/domain/models/vo/spot-trade-prefill-mode-vo'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import type { TradeUnavailableReason } from '~/domain/models/vo/trade-unavailable-reason-vo'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { TradeRecordNotFoundError } from '~/domain/errors/trade-record-not-found-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { TradeAlreadyOpenError } from '~/domain/errors/trade-already-open-error'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import type { BackendRequestBody, BackendRequestValue } from '~/infrastructure/proxy/backend-api-proxy'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const SPOT_TRADE_RECORDS_ENDPOINT = '/spot-trade-records'
const BAD_REQUEST_STATUS = 400
const NOT_FOUND_STATUS = 404
const CONFLICT_STATUS = 409

const FIELD_OF_BACKEND_FIELD: Readonly<Record<string, TradeFormField>> = {
  symbol: 'symbol',
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

const FIELD_OF_MESSAGE_HINT: readonly (readonly [string, TradeFormField])[] = [
  // translation-exempt: 比對後端回覆原文裡的字
  ['超過目前持有', 'exitQuantity'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['整數', 'fillQuantity'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['止損', 'plannedStopLossPrice'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['止盈', 'plannedTakeProfitPrice'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['標的', 'symbol'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['時間', 'fillTime'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['賣出不能早於', 'fillTime'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['手續費', 'fillFee'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['價格', 'fillPrice'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['買進價', 'fillPrice'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['數量', 'fillQuantity'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['信心', 'confidence'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['評分', 'executionScore'],
  // translation-exempt: 比對後端回覆原文裡的字
  ['交易策略', 'tradingStrategy'],
]

type WireNumber = string | number | null | undefined

type TradeTagWire = { id: number, kind: string, name: string }

type SpotTradeRecordWire = {
  id: number
  symbol: string
  market: string
  currency?: string
  status: string
  plan?: {
    plannedStopLossPrice?: WireNumber
    plannedTakeProfitPrice?: WireNumber
    entryReason?: string
    confidence?: number | null
  }
  fills?: { id: number, kind: string, filledAt: string, price: WireNumber, quantity: WireNumber, fee: WireNumber }[]
  notes?: { id: number, content: string, createdAt: string }[]
  setupTags?: TradeTagWire[] | null
  mistakeTags?: TradeTagWire[] | null
  tradingStrategyId?: number | null
  tradingStrategyName?: string | null
  tradingStrategyDeleted?: boolean
  source?: {
    strategyBotName: string
    runNumber: number
    referencePrice?: WireNumber
    suggestedStopLossPrice?: WireNumber
    suggestedTakeProfitPrice?: WireNumber
  } | null
  review?: { wentWell?: string, wentWrong?: string, nextTime?: string, executionScore: number, reviewedAt: string } | null
  openedAt: string
  closedAt?: string | null
  averageBuyPrice: WireNumber
  averageSellPrice?: WireNumber
  boughtQuantity?: WireNumber
  holding: WireNumber
  outcome: {
    grossProfit: WireNumber
    totalFee: WireNumber
    netProfit: WireNumber
    buyCost?: WireNumber
    returnRate?: WireNumber
    plannedRisk?: WireNumber
    rMultiple?: WireNumber
    rMultipleUnavailableReason?: string | null
    excursion?: {
      available: boolean
      adversePrice?: WireNumber
      favorablePrice?: WireNumber
      adverseRMultiple?: WireNumber
      favorableRMultiple?: WireNumber
      unavailableReason?: string | null
    }
    profitCaptureRate?: WireNumber
    floatingProfit?: { available: boolean, amount?: WireNumber, unavailableReason?: string | null }
    entrySlippagePercentage?: WireNumber
  }
}

type SourceGroupWire = { tradeCount?: number, winRate?: number | null, averageReturnRate?: number | null }

type SpotTradeMarketStatisticsWire = {
  market: string
  currency?: string
  closedTradeCount?: number
  winCount?: number
  winRate?: number | null
  netProfit?: WireNumber
  averageReturnRate?: number | null
  profitFactor?: WireNumber
  averageRMultiple?: WireNumber
  rTradeCount?: number
  cumulativeProfit?: { closedAt: string, cumulativeNetProfit: WireNumber }[] | null
  returnDistribution?: { label: string, count: number }[] | null
  mistakeCosts?: { name: string, tradeCount: number, totalNetProfit: WireNumber, averageReturnRate?: number | null }[] | null
  withTradingStrategy?: SourceGroupWire
  selfJudged?: SourceGroupWire
  averageEntrySlippagePercentage?: WireNumber
  entrySlippageTradeCount?: number
}

type SpotTradePrefillWire = {
  mode: string
  targetTradeId?: number | null
  strategyBotName: string
  runNumber: number
  ranAt: string
  signal: string
  symbol: string
  market: string
  price?: WireNumber
  quantity?: WireNumber
  plannedStopLossPrice?: WireNumber
  plannedTakeProfitPrice?: WireNumber
  tradingStrategyId?: number | null
}

const EXCURSION_REASONS: Readonly<Record<string, TradeUnavailableReason>> = {
  noMarketData: 'noMarketData',
}

const FLOATING_PROFIT_REASONS: Readonly<Record<string, TradeUnavailableReason>> = {
  notOpen: 'notApplicable',
  noLatestPrice: 'noLatestPrice',
}

export class SpotTradeRecordProxy extends BackendApiProxy implements ISpotTradeRecordProxy {
  async recordTrade(writeDto: SpotTradeRecordWriteDto): Promise<SpotTradeRecord> {
    const body: BackendRequestBody = {
      symbol: writeDto.symbol,
      firstBuyFill: this.toFillBody(writeDto.firstBuyFill),
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

    return this.requestRecord(SPOT_TRADE_RECORDS_ENDPOINT, 'POST', body)
  }

  async listTrades(queryDto: SpotTradeListQueryDto): Promise<SpotTradeRecordPage> {
    const query: Record<string, string> = queryDto.limit === null ? {} : { limit: String(queryDto.limit) }
    const pageWire = await this.requestBackend<{ totalCount?: number, trades?: SpotTradeRecordWire[] | null }>(
      SPOT_TRADE_RECORDS_ENDPOINT, { query })

    return new SpotTradeRecordPage((pageWire.trades ?? []).map(tradeWire => this.toRecord(tradeWire)), pageWire.totalCount ?? 0)
  }

  async findTrade(id: number): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}`, 'GET')
  }

  async deleteTrade(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.recordFailureOf(error)
    }
  }

  async addFill(id: number, fillWriteDto: SpotTradeFillWriteDto): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/fills`, 'POST', this.toFillBody(fillWriteDto))
  }

  async amendFill(id: number, fillId: number, fillWriteDto: SpotTradeFillWriteDto): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/fills/${fillId}`, 'PUT', this.toFillBody(fillWriteDto))
  }

  async removeFill(id: number, fillId: number): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/fills/${fillId}`, 'DELETE')
  }

  async amendPlan(id: number, planWriteDto: TradePlanWriteDto): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/plan`, 'PUT', {
      plannedStopLossPrice: planWriteDto.plannedStopLossPrice?.toString() ?? null,
      plannedTakeProfitPrice: planWriteDto.plannedTakeProfitPrice?.toString() ?? null,
      entryReason: planWriteDto.entryReason,
      confidence: planWriteDto.confidence,
    })
  }

  async addNote(id: number, content: string): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/notes`, 'POST', { content })
  }

  async writeReview(id: number, reviewWriteDto: TradeReviewWriteDto): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/review`, 'PUT', {
      wentWell: reviewWriteDto.wentWell,
      wentWrong: reviewWriteDto.wentWrong,
      nextTime: reviewWriteDto.nextTime,
      executionScore: reviewWriteDto.executionScore,
      mistakeTagIds: [...reviewWriteDto.mistakeTagIds],
    })
  }

  async assignSetupTags(id: number, setupTagIds: readonly number[]): Promise<SpotTradeRecord> {
    return this.requestRecord(`${SPOT_TRADE_RECORDS_ENDPOINT}/${id}/setup-tags`, 'PUT', { setupTagIds: [...setupTagIds] })
  }

  async findStatistics(period: TradeStatisticsPeriod): Promise<SpotTradeStatistics> {
    const statisticsWire = await this.requestBackend<{ period?: string, markets?: SpotTradeMarketStatisticsWire[] | null }>(
      `${SPOT_TRADE_RECORDS_ENDPOINT}/statistics`, { query: { period } })

    return new SpotTradeStatistics(
      (statisticsWire.period || period) as TradeStatisticsPeriod,
      (statisticsWire.markets ?? []).map(marketWire => new SpotTradeMarketStatistics(
        marketWire.market as SpotTradeMarket,
        marketWire.currency ?? '',
        marketWire.closedTradeCount ?? 0,
        marketWire.winCount ?? 0,
        marketWire.winRate ?? null,
        this.decimalOrNull(marketWire.netProfit) ?? new Decimal(0),
        marketWire.averageReturnRate ?? null,
        this.decimalOrNull(marketWire.profitFactor),
        this.decimalOrNull(marketWire.averageRMultiple),
        marketWire.rTradeCount ?? 0,
        (marketWire.cumulativeProfit ?? []).map(pointWire => new SpotTradeCumulativePoint(
          new Date(pointWire.closedAt), this.decimalOrNull(pointWire.cumulativeNetProfit) ?? new Decimal(0))),
        (marketWire.returnDistribution ?? []).map(bucketWire => new SpotTradeDistributionBucket(
          bucketWire.label, bucketWire.count, !/^\D*[-−]/.test(bucketWire.label))),
        (marketWire.mistakeCosts ?? []).map(mistakeCostWire => new SpotTradeMistakeCost(
          mistakeCostWire.name,
          mistakeCostWire.tradeCount,
          this.decimalOrNull(mistakeCostWire.totalNetProfit) ?? new Decimal(0),
          mistakeCostWire.averageReturnRate ?? null)),
        this.toSourceGroup(marketWire.withTradingStrategy),
        this.toSourceGroup(marketWire.selfJudged),
        this.decimalOrNull(marketWire.averageEntrySlippagePercentage),
        marketWire.entrySlippageTradeCount ?? 0,
      )),
    )
  }

  async findJournalLink(identifier: string): Promise<SpotTradePrefill> {
    try {
      const prefillWire = await this.requestBackend<SpotTradePrefillWire>(
        `${SPOT_TRADE_RECORDS_ENDPOINT}/journal-links/${encodeURIComponent(identifier)}`)

      return new SpotTradePrefill(
        identifier,
        prefillWire.mode as SpotTradePrefillMode,
        prefillWire.targetTradeId ?? null,
        prefillWire.strategyBotName,
        prefillWire.runNumber,
        new Date(prefillWire.ranAt),
        prefillWire.signal as SpotTradeFillKind,
        prefillWire.symbol,
        prefillWire.market as SpotTradeMarket,
        this.decimalOrNull(prefillWire.price),
        this.decimalOrNull(prefillWire.quantity),
        this.decimalOrNull(prefillWire.plannedStopLossPrice),
        this.decimalOrNull(prefillWire.plannedTakeProfitPrice),
        prefillWire.tradingStrategyId ?? null,
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
  ): Promise<SpotTradeRecord> {
    try {
      return this.toRecord(await this.requestBackend<SpotTradeRecordWire>(path, { method, body }))
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
      return new TradeRecordNotFoundError(error.message, { cause: error })
    }

    if (error.status === CONFLICT_STATUS) {
      const mentionedTradeNumber = /#(\d+)/.exec(error.message)?.[1]

      return new TradeAlreadyOpenError(
        error.message,
        error.openTradeId ?? (mentionedTradeNumber === undefined ? null : Number(mentionedTradeNumber)),
        { cause: error })
    }

    if (error.status === BAD_REQUEST_STATUS) {
      const fieldFromBackend = error.field === undefined ? undefined : FIELD_OF_BACKEND_FIELD[error.field]
      const formField = fieldFromBackend ?? FIELD_OF_MESSAGE_HINT.find(([hint]) => error.message.includes(hint))?.[1]

      return new TradeRejectedError(
        new UntranslatedTextVo(error.message),
        formField === undefined ? null : new TradeFormFieldVo(formField),
        null,
        0,
        { cause: error })
    }

    return error
  }

  private toFillBody(fillWriteDto: SpotTradeFillWriteDto): { readonly [key: string]: BackendRequestValue } {
    return {
      kind: fillWriteDto.kind,
      ...(fillWriteDto.filledAt === null ? {} : { filledAt: fillWriteDto.filledAt.toISOString() }),
      price: fillWriteDto.price.toString(),
      quantity: fillWriteDto.quantity.toString(),
      ...(fillWriteDto.fee === null ? {} : { fee: fillWriteDto.fee.toString() }),
    }
  }

  private toRecord(recordWire: SpotTradeRecordWire): SpotTradeRecord {
    const outcomeWire = recordWire.outcome
    const sourceWire = recordWire.source ?? null
    const reviewWire = recordWire.review ?? null
    const excursion = outcomeWire.excursion ?? { available: false }
    const excursionReason = EXCURSION_REASONS[excursion.unavailableReason ?? ''] ?? 'temporarilyUnavailable'
    const floatingProfit = outcomeWire.floatingProfit ?? { available: false }

    return new SpotTradeRecord(
      recordWire.id,
      recordWire.symbol,
      recordWire.market as SpotTradeMarket,
      recordWire.currency ?? '',
      recordWire.status as TradeStatus,
      this.decimalOrNull(recordWire.plan?.plannedStopLossPrice),
      this.decimalOrNull(recordWire.plan?.plannedTakeProfitPrice),
      recordWire.plan?.entryReason ?? '',
      recordWire.plan?.confidence ?? null,
      recordWire.tradingStrategyId ?? null,
      recordWire.tradingStrategyName || null,
      recordWire.tradingStrategyDeleted ?? false,
      new Date(recordWire.openedAt),
      this.dateOrNull(recordWire.closedAt),
      (recordWire.fills ?? []).map(fillWire => new SpotTradeFill(
        fillWire.id,
        fillWire.kind as SpotTradeFillKind,
        new Date(fillWire.filledAt),
        this.decimalOrNull(fillWire.price) ?? new Decimal(0),
        this.decimalOrNull(fillWire.quantity) ?? new Decimal(0),
        this.decimalOrNull(fillWire.fee) ?? new Decimal(0),
      )),
      (recordWire.notes ?? []).map(noteWire => new TradeNote(noteWire.id, noteWire.content, new Date(noteWire.createdAt))),
      [...(recordWire.setupTags ?? []), ...(recordWire.mistakeTags ?? [])].map(tagWire => new TradeTag(
        tagWire.id, tagWire.kind as TradeTagKind, tagWire.name)),
      sourceWire === null
        ? null
        : new TradeSource(
            sourceWire.strategyBotName,
            sourceWire.runNumber,
            this.decimalOrNull(sourceWire.referencePrice),
            this.decimalOrNull(sourceWire.suggestedStopLossPrice),
            this.decimalOrNull(sourceWire.suggestedTakeProfitPrice),
          ),
      reviewWire === null
        ? null
        : new TradeReview(
            reviewWire.wentWell ?? '',
            reviewWire.wentWrong ?? '',
            reviewWire.nextTime ?? '',
            reviewWire.executionScore,
            new Date(reviewWire.reviewedAt),
          ),
      new SpotTradeOutcome(
        this.decimalOrNull(recordWire.holding) ?? new Decimal(0),
        this.decimalOrNull(recordWire.boughtQuantity) ?? new Decimal(0),
        this.decimalOrNull(recordWire.averageBuyPrice) ?? new Decimal(0),
        this.decimalOrNull(recordWire.averageSellPrice),
        this.decimalOrNull(outcomeWire.grossProfit) ?? new Decimal(0),
        this.decimalOrNull(outcomeWire.totalFee) ?? new Decimal(0),
        this.decimalOrNull(outcomeWire.netProfit) ?? new Decimal(0),
        this.decimalOrNull(outcomeWire.buyCost) ?? new Decimal(0),
        this.toMeasure(outcomeWire.returnRate, 'notApplicable'),
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
        this.toMeasure(outcomeWire.entrySlippagePercentage, 'notApplicable'),
      ),
    )
  }

  private toSourceGroup(sourceGroupWire: SourceGroupWire | undefined): SpotTradeSourceGroup {
    return new SpotTradeSourceGroup(
      sourceGroupWire?.tradeCount ?? 0,
      sourceGroupWire?.winRate ?? null,
      sourceGroupWire?.averageReturnRate ?? null,
    )
  }

  private toMeasure(wireNumber: WireNumber, unavailableReason: TradeUnavailableReason): TradeMeasure {
    const value = this.decimalOrNull(wireNumber)

    return new TradeMeasure(value, value === null ? unavailableReason : null)
  }

  private decimalOrNull(wireNumber: WireNumber): Decimal | null {
    return wireNumber === undefined || wireNumber === null || wireNumber === '' ? null : new Decimal(wireNumber)
  }

  private dateOrNull(text: string | null | undefined): Date | null {
    return text === undefined || text === null || text === '' ? null : new Date(text)
  }
}
