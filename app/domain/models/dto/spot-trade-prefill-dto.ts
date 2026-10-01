import type Decimal from 'decimal.js'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { SpotTradePrefillMode } from '~/domain/models/vo/spot-trade-prefill-mode-vo'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'
import { TradePrefillSourceDto } from '~/domain/models/dto/trade-prefill-source-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const PREFILL_HINT = new LocalizedTextVo(
  '紫框是從這一輪帶入的值；價格與數量請改成實際成交。',
  'Values in purple boxes came from this run; change the price and quantity to your actual fill.')

export class SpotTradePrefillDto {
  constructor(
    public readonly journalLinkIdentifier: string,
    public readonly mode: SpotTradePrefillMode,
    public readonly targetTradeId: number | null,
    public readonly targetPath: string | null,
    public readonly sourceLabel: LocalizedTextVo,
    public readonly ranAt: Date,
    public readonly referencePriceText: string | null,
    public readonly notice: LocalizedTextVo | null,
    public readonly signal: SpotTradeFillKind,
    public readonly signalLabel: LocalizedTextVo,
    public readonly signalTone: TradeBadgeTone,
    public readonly symbol: string,
    public readonly market: SpotTradeMarket,
    public readonly price: Decimal | null,
    public readonly quantity: Decimal | null,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly tradingStrategyId: number | null,
  ) {}

  toSourceDto(): TradePrefillSourceDto {
    return new TradePrefillSourceDto(
      this.signalLabel, this.signalTone, this.sourceLabel, this.ranAt, this.referencePriceText, PREFILL_HINT)
  }
}
