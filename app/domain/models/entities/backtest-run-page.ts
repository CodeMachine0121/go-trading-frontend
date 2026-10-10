import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import { BacktestRunPageDto } from '~/domain/models/dto/backtest-run-page-dto'

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
