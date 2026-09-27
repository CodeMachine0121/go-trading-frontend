import type { TradePricePathCandleDto } from '~/domain/models/dto/trade-price-path-candle-dto'
import type { TradePricePathMarkerDto } from '~/domain/models/dto/trade-price-path-marker-dto'
import type { TradePricePathLineDto } from '~/domain/models/dto/trade-price-path-line-dto'

export class TradePricePathDto {
  constructor(
    public readonly candles: readonly TradePricePathCandleDto[],
    public readonly markers: readonly TradePricePathMarkerDto[],
    public readonly lines: readonly TradePricePathLineDto[],
    public readonly emptyMessage: string | null,
  ) {}
}
