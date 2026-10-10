import type Decimal from 'decimal.js'
import type { Backtest } from '~/domain/models/entities/backtest'
import { BacktestRunDomain } from '~/domain/models/domains/backtest-run-domain'
import { BacktestRunPageDto } from '~/domain/models/dto/backtest-run-page-dto'

/** Entity：後端記下的一筆回測輪次，原樣。完成的那一筆在查看明細時才帶著成績單。 */
export class BacktestRun {
  constructor(
    public readonly id: number,
    public readonly kind: string,
    public readonly status: string,
    public readonly progressPercent: number,
    public readonly symbol: string,
    public readonly interval: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly leverage: Decimal | null,
    public readonly tradingMode: string | null,
    public readonly strategyScriptId: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly subjectName: string,
    public readonly submittedAt: Date,
    public readonly finishedAt: Date | null,
    public readonly totalReturnRate: number | null,
    public readonly maximumDrawdown: number | null,
    public readonly tradeCount: number | null,
    public readonly failureReason: string,
    public readonly result: Backtest | null = null,
  ) {}

  toDomain(): BacktestRunDomain {
    return new BacktestRunDomain(this)
  }
}

/** Entity：列出來的一頁輪次，連同全部有幾筆。 */
export class BacktestRunPage {
  constructor(
    public readonly runs: readonly BacktestRun[],
    public readonly totalCount: number,
  ) {}

  toDto(): BacktestRunPageDto {
    return new BacktestRunPageDto(this.runs.map(run => run.toDomain().toDto()), this.totalCount)
  }
}
