import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import type { BacktestRunListQueryDomain } from '~/domain/models/domains/backtest-run-list-query-domain'
import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import { BacktestRunPage } from '~/domain/models/entities/backtest-run-page'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BacktestRunAlreadyEndedError } from '~/domain/errors/backtest-run-already-ended-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import type { BacktestRunDetailWire, BacktestRunWire } from '~/infrastructure/proxy/backtest-run-wire'
import { toBacktestRun, toBacktestRunDetail } from '~/infrastructure/proxy/backtest-run-wire'

const BACKTEST_RUNS_ENDPOINT = '/backtest-runs'

/** 後端用這個狀態碼說「這一筆已經結束，取消不了」。 */
const ALREADY_ENDED_STATUS = 409

type BacktestRunPageWire = {
  runs: BacktestRunWire[] | null
  totalCount: number
}

/** Proxy：回頭看送出過的回測輪次——列、看一筆、取消。 */
export class BacktestRunProxy extends BackendApiProxy implements IBacktestRunProxy {
  async listRuns(queryDomain: BacktestRunListQueryDomain, inBackground: boolean): Promise<BacktestRunPage> {
    const wire = await this.requestBackend<BacktestRunPageWire>(BACKTEST_RUNS_ENDPOINT, {
      method: 'GET',
      query: {
        ...(queryDomain.status === null ? {} : { status: queryDomain.status }),
        ...(queryDomain.strategyScriptId === null ? {} : { strategyScriptId: String(queryDomain.strategyScriptId) }),
        ...(queryDomain.tradingStrategyId === null ? {} : { tradingStrategyId: String(queryDomain.tradingStrategyId) }),
        limit: String(queryDomain.limit),
      },
      background: inBackground,
    })

    return new BacktestRunPage((wire.runs ?? []).map(run => toBacktestRun(run)), wire.totalCount)
  }

  async getRun(id: number): Promise<BacktestRun> {
    const wire = await this.requestBackend<BacktestRunDetailWire>(`${BACKTEST_RUNS_ENDPOINT}/${id}`)

    return toBacktestRunDetail(wire)
  }

  async cancelRun(id: number): Promise<BacktestRun> {
    try {
      const wire = await this.requestBackend<BacktestRunWire>(
        `${BACKTEST_RUNS_ENDPOINT}/${id}/cancel`, { method: 'POST' })

      return toBacktestRun(wire)
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError && error.status === ALREADY_ENDED_STATUS) {
        throw new BacktestRunAlreadyEndedError(error.message, { cause: error })
      }

      throw error
    }
  }
}
