import type { BacktestRunStatus } from '~/domain/models/vo/backtest-run-status-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class BacktestRunStatusOptionDto {
  constructor(
    public readonly value: BacktestRunStatus,
    public readonly label: LocalizedTextVo,
  ) {}
}
