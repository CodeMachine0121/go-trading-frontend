import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { ContractTradePrefillMode } from '~/domain/models/vo/contract-trade-prefill-mode-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import { TradePrefillSourceDto } from '~/domain/models/dto/trade-prefill-source-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const PREFILL_NOTE = new LocalizedTextVo(
  '紫框是從這一輪帶入的值；開倉價與數量請改成實際成交。',
  'Purple-outlined values come from this run; change the entry price and quantity to your actual fill.')

export class ContractTradePrefillDto {
  constructor(
    public readonly journalLinkIdentifier: string,
    public readonly mode: ContractTradePrefillMode,
    public readonly targetTradeId: number | null,
    public readonly targetPath: string | null,
    public readonly sourceLabel: LocalizedTextVo,
    public readonly ranAt: Date,
    public readonly referencePriceText: string | null,
    public readonly notice: LocalizedTextVo | null,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly tradingStrategyId: number | null,
    public readonly entryPrice: Decimal | null,
    public readonly quantity: Decimal | null,
    public readonly directionLabel: LocalizedTextVo,
    public readonly directionTone: TradeBadgeTone,
  ) {}

  toSourceDto(): TradePrefillSourceDto {
    return new TradePrefillSourceDto(
      this.directionLabel, this.directionTone, this.sourceLabel, this.ranAt, this.referencePriceText, PREFILL_NOTE)
  }
}
