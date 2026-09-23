import { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'

/**
 * Entity：一個合約標的在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 它是交易服務合約那一邊認得的標的之一：合約追蹤名單上的，加上手上有合約 K 線的。
 *
 * 同一個名字的現貨標的是另一個商品，兩份清單各自獨立——
 * 合約那邊的 SHIB 叫 `1000SHIBUSDT`，照現貨那份清單挑就挑不到它。
 */
export class ContractTradingSymbol {
  constructor(
    public readonly symbol: string,
    public readonly isWatched: boolean,
  ) {}

  toDto(): ContractTradingSymbolDto {
    return new ContractTradingSymbolDto(this.symbol, this.isWatched)
  }
}
