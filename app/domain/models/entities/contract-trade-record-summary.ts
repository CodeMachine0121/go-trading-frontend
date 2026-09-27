import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { TradeMeasure } from '~/domain/models/entities/trade-measure'
import type { TradeTag } from '~/domain/models/entities/trade-tag'
import type { TradeSource } from '~/domain/models/entities/trade-source'

export class ContractTradeRecordSummary {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly status: TradeStatus,
    public readonly tradingStrategyId: number | null,
    public readonly tradingStrategyName: string | null,
    public readonly tradingStrategyDeleted: boolean,
    public readonly averageEntryPrice: Decimal,
    public readonly averageExitPrice: Decimal | null,
    public readonly netProfit: Decimal | null,
    public readonly floatingProfit: TradeMeasure,
    public readonly rMultiple: TradeMeasure,
    public readonly tags: readonly TradeTag[],
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
    public readonly source: TradeSource | null,
  ) {}
}
