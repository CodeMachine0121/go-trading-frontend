import type { MarketValue } from '~/domain/models/vo/market-vo'

/**
 * DTO：要開始追蹤的那一檔——哪個市場、代號是什麼。
 *
 * 市場與代號一起送，因為同樣的幾個數字在不同市場可能是不同的東西，
 * 而系統不從代號長相猜市場。
 */
export class WatchlistEntryDto {
  constructor(
    public readonly symbol: string,
    public readonly market: MarketValue,
  ) {}
}
