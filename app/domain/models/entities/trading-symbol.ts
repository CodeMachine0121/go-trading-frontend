import { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'

/**
 * Entity：一個可查交易標的在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 它是後端**實際握有 K 線**的那些標的之一，不是設定上打算追蹤的。
 */
export class TradingSymbol {
  constructor(public readonly symbol: string) {}

  toDto(): TradingSymbolDto {
    return new TradingSymbolDto(this.symbol)
  }
}
