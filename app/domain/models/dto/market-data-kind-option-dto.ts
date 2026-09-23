import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/** DTO：行情種類選單上的一個選項。 */
export class MarketDataKindOptionDto {
  constructor(
    public readonly value: MarketDataKind,
    public readonly label: string,
  ) {}
}
