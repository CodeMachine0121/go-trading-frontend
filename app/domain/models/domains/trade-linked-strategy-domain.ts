const SELF_JUDGED_LABEL = '自行判斷'
const TRADING_STRATEGY_DELETED_LABEL = '關聯的交易策略已刪除'

export class TradeLinkedStrategyDomain {
  constructor(
    private readonly tradingStrategyId: number | null,
    private readonly tradingStrategyName: string | null,
    private readonly tradingStrategyDeleted: boolean,
  ) {}

  get label(): string {
    if (this.tradingStrategyId === null) {
      return SELF_JUDGED_LABEL
    }

    return this.tradingStrategyDeleted ? TRADING_STRATEGY_DELETED_LABEL : this.tradingStrategyName ?? ''
  }
}
