import type { ContractTradePerformance } from '~/domain/models/entities/contract-trade-performance'

export class ContractTradeLiveComparisonRow {
  constructor(
    public readonly symbol: string,
    public readonly live: ContractTradePerformance,
    public readonly backtest: ContractTradePerformance | null,
    public readonly backtestFailureReason: string | null,
  ) {}
}
