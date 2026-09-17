import type { Backtest } from '~/domain/models/entities/backtest'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import type { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'

/**
 * 介面以「能力」命名，不以供應商命名：拿一段歷史重演一次。
 * 參數收已驗證的請求，實作端因此不必重覆驗證。
 *
 * 兩個方法是同一個能力的兩種受測對象——一支策略腳本，或一整份交易策略。
 * 分成兩個介面的話，「回測照什麼規則走」那份說明就得有兩個來源。
 * 實作在 app/infrastructure/proxy/backtest-proxy.ts。
 */
export interface IBacktestProxy {
  runBacktest(backtestRequestDomain: BacktestRequestDomain): Promise<Backtest>
  runTradingStrategyBacktest(
    requestDomain: TradingStrategyBacktestRequestDomain,
  ): Promise<Backtest>
}
