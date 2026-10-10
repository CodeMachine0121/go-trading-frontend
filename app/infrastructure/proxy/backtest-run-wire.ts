import Decimal from 'decimal.js'
import { BacktestRun } from '~/domain/models/entities/backtest-run'
import type { Backtest } from '~/domain/models/entities/backtest'
import type { BacktestWire, ContractBacktestWire } from '~/infrastructure/proxy/backtest-result-wire'
import { toBacktest, toContractBacktest } from '~/infrastructure/proxy/backtest-result-wire'

/** 後端記下的一筆輪次在線上的樣子。金額與槓桿是字串——它們是精確小數。 */
export type BacktestRunWire = {
  id: number
  kind: string
  status: string
  progressPercent: number
  symbol: string
  interval: string
  startTime: string
  endTime: string
  leverage: string | null
  tradingMode: string | null
  strategyScriptId: number | null
  tradingStrategyId: number | null
  subjectName: string
  submittedAt: string
  startedAt: string | null
  finishedAt: string | null
  totalReturnRate: number | null
  maximumDrawdown: number | null
  tradeCount: number | null
  failureReason: string
}

/** 點開一筆時多帶的成績單；沒完成是 `null`。 */
export type BacktestRunDetailWire = BacktestRunWire & {
  result: BacktestWire | ContractBacktestWire | null
}

const CONTRACT_KINDS = ['contractScript', 'contractTradingStrategy']

export function toBacktestRun(wire: BacktestRunWire, result: Backtest | null = null): BacktestRun {
  return new BacktestRun(
    wire.id,
    wire.kind,
    wire.status,
    wire.progressPercent,
    wire.symbol,
    wire.interval,
    new Date(wire.startTime),
    new Date(wire.endTime),
    wire.leverage === null ? null : new Decimal(wire.leverage),
    wire.tradingMode,
    wire.strategyScriptId,
    wire.tradingStrategyId,
    wire.subjectName,
    new Date(wire.submittedAt),
    wire.finishedAt === null ? null : new Date(wire.finishedAt),
    wire.totalReturnRate,
    wire.maximumDrawdown,
    wire.tradeCount,
    wire.failureReason,
    result,
  )
}

/** 合約的成績單多幾格，由這一筆是哪一種回測決定讀法。 */
export function toBacktestRunDetail(wire: BacktestRunDetailWire): BacktestRun {
  if (wire.result === null) {
    return toBacktestRun(wire)
  }

  return toBacktestRun(wire, CONTRACT_KINDS.includes(wire.kind)
    ? toContractBacktest(wire.result as ContractBacktestWire)
    : toBacktest(wire.result as BacktestWire))
}
