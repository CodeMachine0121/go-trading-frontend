import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import type { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import type { ContractBacktestTermsDomain } from '~/domain/models/domains/contract-backtest-terms-domain'

/**
 * 介面以「能力」命名：送出一次重演。後端不當場算，回的是一筆輪次；成績單之後拿輪次去看。
 * 參數收已驗證的請求，實作端因此不必重覆驗證。實作在 app/infrastructure/proxy/backtest-proxy.ts。
 */
export interface IBacktestProxy {
  submitBacktest(backtestRequestDomain: BacktestRequestDomain): Promise<BacktestRun>
  submitTradingStrategyBacktest(
    requestDomain: TradingStrategyBacktestRequestDomain,
  ): Promise<BacktestRun>
  submitContractBacktest(
    requestDomain: BacktestRequestDomain, termsDomain: ContractBacktestTermsDomain,
  ): Promise<BacktestRun>
  /** 交易模式是那份交易策略自己的，不送。 */
  submitContractTradingStrategyBacktest(
    requestDomain: TradingStrategyBacktestRequestDomain, termsDomain: ContractBacktestTermsDomain,
  ): Promise<BacktestRun>
}
