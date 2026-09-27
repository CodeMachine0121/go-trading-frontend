import type { ContractTradePricePathCandleDto } from '~/domain/models/dto/contract-trade-price-path-candle-dto'
import type { ContractTradePricePathMarkerDto } from '~/domain/models/dto/contract-trade-price-path-marker-dto'
import type { ContractTradePricePathLineDto } from '~/domain/models/dto/contract-trade-price-path-line-dto'

export class ContractTradePricePathDto {
  constructor(
    public readonly candles: readonly ContractTradePricePathCandleDto[],
    public readonly markers: readonly ContractTradePricePathMarkerDto[],
    public readonly lines: readonly ContractTradePricePathLineDto[],
    public readonly emptyMessage: string | null,
  ) {}
}
