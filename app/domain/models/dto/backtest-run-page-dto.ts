import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'

export class BacktestRunPageDto {
  constructor(
    public readonly runs: readonly BacktestRunDto[],
    public readonly totalCount: number,
  ) {}
}
