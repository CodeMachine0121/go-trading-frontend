import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { buildBacktestProxy, buildBacktestRunProxy } from './backtest-run'

/**
 * 回測要打的是另外兩個外部資源（送出、回頭看），只 mock 它們的介面；
 * application、domain service 與 domain model 都是真的。
 *
 * 預設送出就回一筆排隊中的輪次、列表空的：既有的面板測試從來不打開回測那個去處，
 * 給它不會拋的替身就夠。
 */
export function buildBacktestApplication(
  overrides: Partial<IBacktestProxy> = {},
  runOverrides: Partial<IBacktestRunProxy> = {},
): BacktestApplication {
  return new BacktestApplication(new BacktestService(
    buildBacktestProxy(overrides), buildBacktestRunProxy(runOverrides)))
}
