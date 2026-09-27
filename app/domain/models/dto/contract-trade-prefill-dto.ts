import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradePrefillMode } from '~/domain/models/vo/contract-trade-prefill-mode-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import { TradePrefillSourceDto } from '~/domain/models/dto/trade-prefill-source-dto'

export class ContractTradePrefillDto {
  constructor(
    public readonly journalLinkIdentifier: string,
    public readonly mode: ContractTradePrefillMode,
    public readonly targetTradeId: number | null,
    public readonly targetPath: string | null,
    public readonly sourceLabel: string,
    public readonly ranAt: Date,
    public readonly referencePriceText: string | null,
    public readonly notice: string | null,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly tradingStrategyId: number | null,
    public readonly entryPrice: Decimal | null,
    public readonly quantity: Decimal | null,
    public readonly directionLabel: string,
    public readonly directionTone: TradeBadgeTone,
  ) {}

  toSourceDto(): TradePrefillSourceDto {
    return new TradePrefillSourceDto(
      this.directionLabel, this.directionTone, this.sourceLabel, this.ranAt, this.referencePriceText, '紫框是從這一輪帶入的值；開倉價與數量請改成實際成交。')
  }
}
