import Decimal from 'decimal.js'
import { vi } from 'vitest'
import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'
import { SpotTradeFill } from '~/domain/models/entities/spot-trade-fill'
import { SpotTradeOutcome } from '~/domain/models/entities/spot-trade-outcome'
import { SpotTradeStatistics } from '~/domain/models/entities/spot-trade-statistics'
import { SpotTradeMarketStatistics } from '~/domain/models/entities/spot-trade-market-statistics'
import { SpotTradeSourceGroup } from '~/domain/models/entities/spot-trade-source-group'
import { TradeSource } from '~/domain/models/entities/trade-source'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { measured, unavailable } from './contract-trade-journal'

export function closedSpotOutcome(overrides: Partial<Record<keyof SpotTradeOutcome, unknown>> = {}): SpotTradeOutcome {
  const base = {
    holding: new Decimal('0'),
    boughtQuantity: new Decimal('1000'),
    averageBuyPrice: new Decimal('1050'),
    averageSellPrice: new Decimal('1120'),
    grossProfit: new Decimal('70000'),
    totalFee: new Decimal('2100'),
    netProfit: new Decimal('67900'),
    buyCost: new Decimal('1050000'),
    returnRate: measured('0.0647'),
    plannedRisk: measured('50000'),
    rMultiple: measured('1.36'),
    maximumAdverseExcursion: measured('-0.6'),
    maximumFavorableExcursion: measured('2'),
    maximumAdversePrice: new Decimal('1020'),
    maximumFavorablePrice: new Decimal('1150'),
    profitCaptureRate: measured('0.7'),
    floatingProfit: unavailable('notApplicable'),
    entrySlippagePercentage: unavailable('notApplicable'),
    ...overrides,
  } as Record<keyof SpotTradeOutcome, never>

  return new SpotTradeOutcome(
    base.holding,
    base.boughtQuantity,
    base.averageBuyPrice,
    base.averageSellPrice,
    base.grossProfit,
    base.totalFee,
    base.netProfit,
    base.buyCost,
    base.returnRate,
    base.plannedRisk,
    base.rMultiple,
    base.maximumAdverseExcursion,
    base.maximumFavorableExcursion,
    base.maximumAdversePrice,
    base.maximumFavorablePrice,
    base.profitCaptureRate,
    base.floatingProfit,
    base.entrySlippagePercentage,
  )
}

export function buildSpotRecord(overrides: Partial<Record<keyof SpotTradeRecord, unknown>> = {}): SpotTradeRecord {
  const base = {
    id: 5,
    symbol: '2330',
    market: 'taiwanStock',
    currency: 'TWD',
    status: 'closed',
    plannedStopLossPrice: new Decimal('1000'),
    plannedTakeProfitPrice: null,
    entryReason: '法說會後回檔',
    confidence: 3,
    tradingStrategyId: null,
    tradingStrategyName: null,
    tradingStrategyDeleted: false,
    openedAt: new Date('2026-09-01T01:00:00Z'),
    closedAt: new Date('2026-09-03T03:30:00Z'),
    fills: [
      new SpotTradeFill(2, 'sell', new Date('2026-09-03T03:30:00Z'), new Decimal('1120'), new Decimal('1000'), new Decimal('1983')),
      new SpotTradeFill(1, 'buy', new Date('2026-09-01T01:00:00Z'), new Decimal('1050'), new Decimal('1000'), new Decimal('117')),
    ],
    notes: [],
    tags: [new TradeTag(3, 'mistake', '追價進場')],
    source: null,
    review: null,
    outcome: closedSpotOutcome(),
    ...overrides,
  } as Record<keyof SpotTradeRecord, never>

  return new SpotTradeRecord(
    base.id,
    base.symbol,
    base.market,
    base.currency,
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

export function linkedSource(): TradeSource {
  return new TradeSource('台積電趨勢', 88, new Decimal('1048'), new Decimal('1000'), new Decimal('1150'))
}

export function spotMarketStatistics(
  overrides: Partial<Record<keyof SpotTradeMarketStatistics, unknown>> = {},
): SpotTradeMarketStatistics {
  const base = {
    market: 'taiwanStock',
    currency: 'TWD',
    closedTradeCount: 10,
    winCount: 6,
    winRate: 0.6,
    netProfit: new Decimal('120000'),
    averageReturnRate: 0.0312,
    profitFactor: new Decimal('1.8'),
    averageRMultiple: new Decimal('0.9'),
    rTradeCount: 3,
    cumulativeProfit: [],
    returnDistribution: [],
    mistakeCosts: [],
    linkedGroup: new SpotTradeSourceGroup(4, 0.75, 0.05),
    selfJudgedGroup: new SpotTradeSourceGroup(6, 0.5, null),
    averageEntrySlippagePercentage: null,
    entrySlippageTradeCount: 0,
    ...overrides,
  } as Record<keyof SpotTradeMarketStatistics, never>

  return new SpotTradeMarketStatistics(
    base.market,
    base.currency,
    base.closedTradeCount,
    base.winCount,
    base.winRate,
    base.netProfit,
    base.averageReturnRate,
    base.profitFactor,
    base.averageRMultiple,
    base.rTradeCount,
    base.cumulativeProfit,
    base.returnDistribution,
    base.mistakeCosts,
    base.linkedGroup,
    base.selfJudgedGroup,
    base.averageEntrySlippagePercentage,
    base.entrySlippageTradeCount,
  )
}

export function spotStatistics(markets: readonly SpotTradeMarketStatistics[] = [
  spotMarketStatistics(),
  spotMarketStatistics({ market: 'crypto', currency: 'USDT', closedTradeCount: 0, winCount: 0, winRate: null, netProfit: new Decimal(0) }),
]): SpotTradeStatistics {
  return new SpotTradeStatistics('30d', markets)
}

export function spotTradeRecordProxyMock(): { [Method in keyof ISpotTradeRecordProxy]: ReturnType<typeof vi.fn> } {
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

export function kCandleProxyMock(): { [Method in keyof IKCandleProxy]: ReturnType<typeof vi.fn> } {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn(),
  }
}
