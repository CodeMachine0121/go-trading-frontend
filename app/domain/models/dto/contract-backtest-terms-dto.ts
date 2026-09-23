import type Decimal from 'decimal.js'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'

/**
 * DTO：一次合約重演多問的那幾格，還沒有被任何規則看過。
 *
 * 留白的槓桿與滑點是零——零就是「沒說」，交易服務讀成一倍、不計滑點。
 */
export class ContractBacktestTermsDto {
  constructor(
    public readonly leverage: Decimal,
    public readonly slippagePercentage: Decimal,
    /**
     * 這一次照哪一種交易模式。重演一份交易策略時是 `null`——
     * 交易模式是那份交易策略自己說的，重演時不能另外給。
     */
    public readonly tradingMode: ContractTradingMode | null,
  ) {}
}
