import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import type { BacktestRunPage } from '~/domain/models/entities/backtest-run-page'
import type { BacktestRunListQueryDomain } from '~/domain/models/domains/backtest-run-list-query-domain'

/**
 * 介面以「能力」命名：回頭看送出過的回測輪次。
 * 列表可以走背景（畫面自己定期重讀，不算使用者在等）。實作在 app/infrastructure/proxy/backtest-run-proxy.ts。
 */
export interface IBacktestRunProxy {
  listRuns(queryDomain: BacktestRunListQueryDomain, inBackground: boolean): Promise<BacktestRunPage>
  /** 一筆輪次連同完成時的成績單。 */
  getRun(id: number): Promise<BacktestRun>
  cancelRun(id: number): Promise<BacktestRun>
}
