import type { BacktestRunStatus } from '~/domain/models/vo/backtest-run-status-vo'

/** DTO：要列哪些輪次——依狀態、依來源（腳本或交易策略）篩，最多幾筆。留 `null` 就是不篩、照預設。 */
export class BacktestRunListQueryDto {
  constructor(
    public readonly status: BacktestRunStatus | null = null,
    public readonly strategyScriptId: number | null = null,
    public readonly tradingStrategyId: number | null = null,
    public readonly limit: number | null = null,
  ) {}

  withLimit(limit: number): BacktestRunListQueryDto {
    return new BacktestRunListQueryDto(this.status, this.strategyScriptId, this.tradingStrategyId, limit)
  }
}
