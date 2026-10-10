import type Decimal from 'decimal.js'
import { vi } from 'vitest'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import { BacktestRun } from '~/domain/models/entities/backtest-run'
import { BacktestRunPage } from '~/domain/models/entities/backtest-run-page'
import type { Backtest } from '~/domain/models/entities/backtest'

export const RUN_SUBMITTED_AT = new Date('2026-10-10T02:00:00Z')
export const RUN_START = new Date('2026-08-06T00:00:00Z')
export const RUN_END = new Date('2026-09-04T23:00:00Z')

/**
 * 後端記下的一筆輪次。預設是剛送出、排隊中的現貨腳本回測；
 * 要什麼狀態、哪一種、帶不帶成績單，由呼叫端覆寫。
 */
export function buildBacktestRun(overrides: Partial<{
  id: number
  kind: string
  status: string
  progressPercent: number
  symbol: string
  interval: string
  leverage: Decimal | null
  tradingMode: string | null
  strategyScriptId: number | null
  tradingStrategyId: number | null
  subjectName: string
  finishedAt: Date | null
  totalReturnRate: number | null
  maximumDrawdown: number | null
  tradeCount: number | null
  failureReason: string
  result: Backtest | null
}> = {}): BacktestRun {
  return new BacktestRun(
    overrides.id ?? 40,
    overrides.kind ?? 'spotScript',
    overrides.status ?? 'queued',
    overrides.progressPercent ?? 0,
    overrides.symbol ?? 'BTCUSDT',
    overrides.interval ?? '1h',
    RUN_START,
    RUN_END,
    overrides.leverage === undefined ? null : overrides.leverage,
    overrides.tradingMode === undefined ? null : overrides.tradingMode,
    overrides.strategyScriptId === undefined ? null : overrides.strategyScriptId,
    overrides.tradingStrategyId === undefined ? null : overrides.tradingStrategyId,
    overrides.subjectName ?? '均線交叉',
    RUN_SUBMITTED_AT,
    overrides.finishedAt === undefined ? null : overrides.finishedAt,
    overrides.totalReturnRate === undefined ? null : overrides.totalReturnRate,
    overrides.maximumDrawdown === undefined ? null : overrides.maximumDrawdown,
    overrides.tradeCount === undefined ? null : overrides.tradeCount,
    overrides.failureReason ?? '',
    overrides.result ?? null,
  )
}

/** 一筆剛送出的輪次在線上的樣子——送出回測的端點回的就是它。 */
export function queuedRunWire(overrides: Record<string, unknown> = {}) {
  return {
    id: 40,
    kind: 'spotScript',
    status: 'queued',
    progressPercent: 0,
    symbol: 'BTCUSDT',
    interval: '1h',
    startTime: RUN_START.toISOString(),
    endTime: RUN_END.toISOString(),
    leverage: null,
    tradingMode: null,
    strategyScriptId: null,
    tradingStrategyId: null,
    subjectName: '均線交叉',
    submittedAt: RUN_SUBMITTED_AT.toISOString(),
    startedAt: null,
    finishedAt: null,
    totalReturnRate: null,
    maximumDrawdown: null,
    tradeCount: null,
    failureReason: '',
    ...overrides,
  }
}

/** 送出回測的替身：四種入口都回一筆排隊中的輪次。 */
export function buildBacktestProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun({ kind: 'spotTradingStrategy' })),
    submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun({ kind: 'contractScript' })),
    submitContractTradingStrategyBacktest: vi.fn().mockResolvedValue(
      buildBacktestRun({ kind: 'contractTradingStrategy' })),
    ...overrides,
  }
}

/** 回頭看輪次的替身：預設一筆都沒有。 */
export function buildBacktestRunProxy(overrides: Partial<IBacktestRunProxy> = {}): IBacktestRunProxy {
  return {
    listRuns: vi.fn().mockResolvedValue(new BacktestRunPage([], 0)),
    getRun: vi.fn().mockResolvedValue(buildBacktestRun()),
    cancelRun: vi.fn().mockResolvedValue(buildBacktestRun({ status: 'cancelled' })),
    ...overrides,
  }
}
