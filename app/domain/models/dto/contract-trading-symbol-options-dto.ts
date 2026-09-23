import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'

/**
 * DTO：挑合約那一格這一次該長什麼樣子。
 *
 * 選項與「該選著哪一個」一起交出去：分兩次問，就有機會選出一個不在選單上的合約。
 */
export class ContractTradingSymbolOptionsDto {
  constructor(
    public readonly options: readonly ContractTradingSymbolDto[],
    /** 合約那一邊一個標的都沒有。 */
    public readonly hasNone: boolean,
    /**
     * 該選著哪一個。清單上沒有目前那一個時是第一個；
     * 清單是空的時候維持原樣——清空會變成怪使用者沒挑。
     */
    public readonly selectedSymbol: string,
  ) {}
}
