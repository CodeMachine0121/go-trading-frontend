import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'
import { ContractTradingSymbolOptionsDto } from '~/domain/models/dto/contract-trading-symbol-options-dto'

/**
 * Domain Model：挑合約那一格上該列哪幾個、該選著哪一個。
 *
 * 目前選著的那一個在清單上就原封不動；不在，改選清單上的第一個——
 * 盯著一個查不出東西、也選不掉的名字最沒有用。
 *
 * 清單是空的時候**不動它**：清空欄位會變成「請指定交易標的」，那是在怪使用者沒挑，
 * 但真正的原因是合約那一邊還沒有任何標的，挑合約那一格自己會說出這一點。
 */
export class ContractTradingSymbolOptionsDomain {
  private readonly contractTradingSymbols: readonly ContractTradingSymbolDto[]

  /**
   * @param watchedOnly 只列合約追蹤名單上的那幾個。合約機器人只盯正在追蹤的合約——
   *   列出沒在追蹤的，只會換來一個存下時被拒絕的選項。
   */
  constructor(
    contractTradingSymbols: readonly ContractTradingSymbolDto[],
    private readonly selectedSymbol: string,
    watchedOnly = false,
  ) {
    this.contractTradingSymbols = watchedOnly
      ? contractTradingSymbols.filter(contractTradingSymbol => contractTradingSymbol.isWatched)
      : contractTradingSymbols
  }

  toDto(): ContractTradingSymbolOptionsDto {
    const isListed = this.contractTradingSymbols.some(
      contractTradingSymbol => contractTradingSymbol.symbol === this.selectedSymbol)

    return new ContractTradingSymbolOptionsDto(
      this.contractTradingSymbols,
      this.contractTradingSymbols.length === 0,
      isListed
        ? this.selectedSymbol
        : this.contractTradingSymbols[0]?.symbol ?? this.selectedSymbol,
    )
  }
}
