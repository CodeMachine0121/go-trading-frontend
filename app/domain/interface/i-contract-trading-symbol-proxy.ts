import type { ContractTradingSymbol } from '~/domain/models/entities/contract-trading-symbol'

/**
 * 介面以「能力」命名，不以供應商命名。
 * 合約標的清單是另一個外部資源（`/contract-trading-symbols`），與現貨那份清單各自獨立。
 * 實作在 app/infrastructure/proxy/contract-trading-symbol-proxy.ts。
 */
export interface IContractTradingSymbolProxy {
  /** 合約那一邊認得的每一個標的，順序原樣沿用後端給的。 */
  findContractTradingSymbols(): Promise<ContractTradingSymbol[]>
}
