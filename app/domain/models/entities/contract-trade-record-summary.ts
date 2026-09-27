import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradeStatus } from '~/domain/models/vo/contract-trade-status-vo'
import type { ContractTradeMeasure } from '~/domain/models/entities/contract-trade-measure'
import type { TradeTag } from '~/domain/models/entities/trade-tag'

export class ContractTradeRecordSummary {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly status: ContractTradeStatus,
    public readonly tradingStrategyId: number | null,
    public readonly tradingStrategyName: string | null,
    public readonly tradingStrategyDeleted: boolean,
    public readonly averageEntryPrice: Decimal,
    public readonly averageExitPrice: Decimal | null,
    public readonly netProfit: Decimal | null,
    public readonly floatingProfit: ContractTradeMeasure,
    public readonly rMultiple: ContractTradeMeasure,
    public readonly tags: readonly TradeTag[],
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
  ) {}
}
