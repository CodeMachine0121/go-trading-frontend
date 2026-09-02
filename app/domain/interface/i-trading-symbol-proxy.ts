import type { TradingSymbol } from '~/domain/models/entities/trading-symbol'

/**
 * 介面以「能力」命名，不以供應商命名。
 * 可查交易標的是另一個外部資源（`/trading-symbols`），因此有自己的 proxy，
 * 不併進 K 線那一個——一個外部資源一個 Proxy。
 * 實作在 app/infrastructure/proxy/trading-symbol-proxy.ts。
 */
export interface ITradingSymbolProxy {
  /** 取回後端目前握有 K 線的每一個交易標的，順序原樣沿用後端給的。 */
  findTradingSymbols(): Promise<TradingSymbol[]>
}
