import Decimal from 'decimal.js'
import { vi } from 'vitest'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import { ContractTradeRecord } from '~/domain/models/entities/contract-trade-record'
import { ContractTradeRecordSummary } from '~/domain/models/entities/contract-trade-record-summary'
import { ContractTradeRecordPage } from '~/domain/models/entities/contract-trade-record-page'
import { ContractTradeFill } from '~/domain/models/entities/contract-trade-fill'
import { TradeNote } from '~/domain/models/entities/trade-note'
import { ContractTradeOutcome } from '~/domain/models/entities/contract-trade-outcome'
import { TradeMeasure } from '~/domain/models/entities/trade-measure'
import { TradeSource } from '~/domain/models/entities/trade-source'
import { ContractTradeStatistics } from '~/domain/models/entities/contract-trade-statistics'
import { ContractTradeSourceGroup } from '~/domain/models/entities/contract-trade-source-group'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import type { TradeUnavailableReason } from '~/domain/models/vo/trade-unavailable-reason-vo'
import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { ContractTradeCumulativePoint } from '~/domain/models/entities/contract-trade-cumulative-point'
import type { ContractTradeDistributionBucket } from '~/domain/models/entities/contract-trade-distribution-bucket'
import type { ContractTradeMistakeCost } from '~/domain/models/entities/contract-trade-mistake-cost'
import { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'

export function measured(value: string): TradeMeasure {
  return new TradeMeasure(new Decimal(value), null)
}

export function unavailable(reason: TradeUnavailableReason): TradeMeasure {
  return new TradeMeasure(null, reason)
}

export function closedOutcome(overrides: Partial<Record<keyof ContractTradeOutcome, unknown>> = {}): ContractTradeOutcome {
  const base = {
    position: new Decimal('0'),
    averageEntryPrice: new Decimal('97927.6'),
    averageExitPrice: new Decimal('100420'),
    grossProfit: new Decimal('127.11'),
    totalFee: new Decimal('5.06'),
    feeRateMissing: false,
    fundingFee: measured('-1.52'),
    netProfit: new Decimal('120.53'),
    netProfitExcludesFunding: false,
    plannedRisk: measured('78.93'),
    rMultiple: measured('1.53'),
    maximumAdverseExcursion: measured('-0.53'),
    maximumFavorableExcursion: measured('1.96'),
    maximumAdversePrice: new Decimal('97110'),
    maximumFavorablePrice: new Decimal('100960'),
    profitCaptureRate: measured('0.82'),
    floatingProfit: unavailable('notApplicable'),
    estimatedLiquidationPrice: unavailable('notApplicable'),
    entrySlippagePercentage: measured('0.06'),
    ...overrides,
  } as Record<keyof ContractTradeOutcome, never>

  return new ContractTradeOutcome(
    base.position,
    base.averageEntryPrice,
    base.averageExitPrice,
    base.grossProfit,
    base.totalFee,
    base.feeRateMissing,
    base.fundingFee,
    base.netProfit,
    base.netProfitExcludesFunding,
    base.plannedRisk,
    base.rMultiple,
    base.maximumAdverseExcursion,
    base.maximumFavorableExcursion,
    base.maximumAdversePrice,
    base.maximumFavorablePrice,
    base.profitCaptureRate,
    base.floatingProfit,
    base.estimatedLiquidationPrice,
    base.entrySlippagePercentage,
  )
}

export function buildRecord(overrides: Partial<Record<keyof ContractTradeRecord, unknown>> = {}): ContractTradeRecord {
  const base = {
    id: 27,
    symbol: 'BTCUSDT',
    direction: 'long',
    leverage: new Decimal('10'),
    status: 'closed',
    plannedStopLossPrice: new Decimal('96380'),
    plannedTakeProfitPrice: new Decimal('100785'),
    entryReason: '4H 收在前高之上',
    confidence: 3,
    tradingStrategyId: 5,
    tradingStrategyName: 'BTC 趨勢跟隨',
    tradingStrategyDeleted: false,
    openedAt: new Date('2026-09-25T06:03:00Z'),
    closedAt: new Date('2026-09-26T08:40:00Z'),
    fills: [
      new ContractTradeFill(2, 'entry', new Date('2026-09-25T06:11:00Z'), new Decimal('97960'), new Decimal('0.021'), 'taker', new Decimal('1.03'), false),
      new ContractTradeFill(1, 'entry', new Date('2026-09-25T06:03:00Z'), new Decimal('97905'), new Decimal('0.030'), 'taker', new Decimal('1.47'), false),
      new ContractTradeFill(3, 'exit', new Date('2026-09-26T08:40:00Z'), new Decimal('100420'), new Decimal('0.051'), 'maker', new Decimal('2.56'), true),
    ],
    notes: [
      new TradeNote(2, '第二則', new Date('2026-09-27T02:00:00Z')),
      new TradeNote(1, '第一則', new Date('2026-09-26T09:00:00Z')),
    ],
    tags: [new TradeTag(1, 'setup', '突破'), new TradeTag(2, 'mistake', '提早出場')],
    source: new TradeSource('BTC 趨勢跟隨', 412, new Decimal('97850'), new Decimal('96380'), new Decimal('100785')),
    review: null,
    outcome: closedOutcome(),
    ...overrides,
  } as Record<keyof ContractTradeRecord, never>

  return new ContractTradeRecord(
    base.id,
    base.symbol,
    base.direction,
    base.leverage,
    base.status,
    base.plannedStopLossPrice,
    base.plannedTakeProfitPrice,
    base.entryReason,
    base.confidence,
    base.tradingStrategyId,
    base.tradingStrategyName,
    base.tradingStrategyDeleted,
    base.openedAt,
    base.closedAt,
    base.fills,
    base.notes,
    base.tags,
    base.source,
    base.review,
    base.outcome,
  )
}

export function buildSummary(overrides: Partial<Record<keyof ContractTradeRecordSummary, unknown>> = {}): ContractTradeRecordSummary {
  const base = {
    id: 27,
    symbol: 'BTCUSDT',
    direction: 'long',
    leverage: new Decimal('10'),
    status: 'closed' as TradeStatus,
    tradingStrategyId: 5,
    tradingStrategyName: 'BTC 趨勢跟隨',
    tradingStrategyDeleted: false,
    averageEntryPrice: new Decimal('97927.6'),
    averageExitPrice: new Decimal('100420'),
    netProfit: new Decimal('120.53'),
    floatingProfit: unavailable('notApplicable'),
    rMultiple: measured('1.53'),
    tags: [new TradeTag(1, 'setup', '突破')],
    openedAt: new Date('2026-09-25T06:03:00Z'),
    closedAt: new Date('2026-09-26T08:40:00Z'),
    source: null,
    ...overrides,
  } as Record<keyof ContractTradeRecordSummary, never>

  return new ContractTradeRecordSummary(
    base.id,
    base.symbol,
    base.direction,
    base.leverage,
    base.status,
    base.tradingStrategyId,
    base.tradingStrategyName,
    base.tradingStrategyDeleted,
    base.averageEntryPrice,
    base.averageExitPrice,
    base.netProfit,
    base.floatingProfit,
    base.rMultiple,
    base.tags,
    base.openedAt,
    base.closedAt,
    base.source,
  )
}

export function buildStatistics(overrides: Partial<Record<keyof ContractTradeStatistics, unknown>> = {}): ContractTradeStatistics {
  const base = {
    period: '30d',
    closedTradeCount: 30,
    winCount: 14,
    netProfit: new Decimal('1284.60'),
    winRate: 14 / 30,
    averageRMultiple: new Decimal('0.38'),
    profitFactor: new Decimal('1.46'),
    feeShareOfGrossProfit: 0.18,
    averageEntrySlippagePercentage: new Decimal('0.07'),
    slippageTradeCount: 2,
    excludedFromRMultipleCount: 0,
    cumulativeRMultiples: [] as ContractTradeCumulativePoint[],
    rMultipleDistribution: [] as ContractTradeDistributionBucket[],
    mistakeCosts: [] as ContractTradeMistakeCost[],
    linkedGroup: new ContractTradeSourceGroup(22, 0.56, new Decimal('0.71')),
    selfJudgedGroup: new ContractTradeSourceGroup(8, 0.25, new Decimal('-0.28')),
    ...overrides,
  } as Record<keyof ContractTradeStatistics, never>

  return new ContractTradeStatistics(
    base.period,
    base.closedTradeCount,
    base.winCount,
    base.netProfit,
    base.winRate,
    base.averageRMultiple,
    base.profitFactor,
    base.feeShareOfGrossProfit,
    base.averageEntrySlippagePercentage,
    base.slippageTradeCount,
    base.excludedFromRMultipleCount,
    base.cumulativeRMultiples,
    base.rMultipleDistribution,
    base.mistakeCosts,
    base.linkedGroup,
    base.selfJudgedGroup,
  )
}

export function buildPage(summaries: ContractTradeRecordSummary[]): ContractTradeRecordPage {
  return new ContractTradeRecordPage(summaries, summaries.length)
}

export function takerFeeSetting(): TradeJournalSettingDto {
  return new TradeJournalSettingDto(new Decimal('0.02'), new Decimal('0.05'), true, '')
}

export function unconfiguredFeeSetting(): TradeJournalSettingDto {
  return new TradeJournalSettingDto(null, null, false, '還沒設定')
}

export function unconfiguredSettingEntity(): TradeJournalSetting {
  return new TradeJournalSetting(null, null)
}

export function contractTradeRecordProxyMock(): { [Method in keyof IContractTradeRecordProxy]: ReturnType<typeof vi.fn> } {
  return {
    recordTrade: vi.fn(),
    listTrades: vi.fn(),
    findTrade: vi.fn(),
    deleteTrade: vi.fn(),
    addFill: vi.fn(),
    amendFill: vi.fn(),
    removeFill: vi.fn(),
    amendPlan: vi.fn(),
    addNote: vi.fn(),
    writeReview: vi.fn(),
    assignSetupTags: vi.fn(),
    findStatistics: vi.fn(),
    findJournalLink: vi.fn(),
  }
}

export function tradingStrategyProxyMock(): { [Method in keyof ITradingStrategyProxy]: ReturnType<typeof vi.fn> } {
  return {
    listTradingStrategies: vi.fn(),
    getTradingStrategy: vi.fn(),
    createTradingStrategy: vi.fn(),
    updateTradingStrategy: vi.fn(),
    deleteTradingStrategy: vi.fn(),
    findContractTradeComparison: vi.fn(),
    findSpotTradeComparison: vi.fn(),
  }
}

export function kCandleContractProxyMock(): { [Method in keyof IKCandleContractProxy]: ReturnType<typeof vi.fn> } {
  return {
    findKCandleContractsInRange: vi.fn(),
    findKCandleContractSeries: vi.fn(),
  }
}
