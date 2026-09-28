import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'
import type { ContractTradeSizeMode } from '~/domain/models/vo/contract-trade-size-mode-vo'

export class ContractTradeDraftFillInputDto {
  constructor(
    public readonly key: number,
    public kind: ContractTradeFillKind,
    public filledAtText: string,
    public priceText: string,
    public quantityText: string,
    public liquidity: TradeFillLiquidity,
    public feeText: string,
    public sizeMode: ContractTradeSizeMode = 'quantity',
  ) {}
}
