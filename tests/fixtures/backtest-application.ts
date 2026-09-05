import { vi } from 'vitest'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { Backtest } from '~/domain/models/entities/backtest'
import Decimal from 'decimal.js'

/**
 * 回測要打的是另一個外部資源，只 mock 它的介面；
 * application、domain service 與 domain model 都是真的。
 *
 * 預設回一次「什麼都沒發生」的重演：既有的面板測試從來不打開回測那個去處，
 * 給它一個不會拋的替身就夠，而不必每個檔案各編一份成績單。
 */
export function buildBacktestApplication(
  overrides: Partial<IBacktestProxy> = {},
): BacktestApplication {
  return new BacktestApplication(new BacktestService({
    runBacktest: vi.fn().mockResolvedValue(new Backtest(
      'BTCUSDT', '5m', new Date(0), new Date(0), 0,
      new Decimal(10000), new Decimal(10000), 0, 0, null, 0, [], [])),
    ...overrides,
  }))
}
