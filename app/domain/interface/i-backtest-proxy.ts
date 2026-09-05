import type { Backtest } from '~/domain/models/entities/backtest'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'

/**
 * 介面以「能力」命名，不以供應商命名：把一支策略拿去歷史上重演一次。
 * 參數收已驗證的請求，實作端因此不必重覆驗證。
 * 實作在 app/infrastructure/proxy/backtest-proxy.ts。
 */
export interface IBacktestProxy {
  runBacktest(backtestRequestDomain: BacktestRequestDomain): Promise<Backtest>
}
