import type Decimal from 'decimal.js'
import { ContractAutoOrderResultDomain } from '~/domain/models/domains/contract-auto-order-result-domain'

/**
 * Entity：一輪的下單結果，照交易服務的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * 動作與原因是交易服務寫好的中文（「做多」「餘額不足」），數字可以是 `null`——沒做到那一步就沒有。
 */
export class ContractAutoOrderResult {
  constructor(
    /** `pending`／`filled`／`partiallyDone`／`unfilled`／`notPlaced`／`abandoned`。 */
    public readonly status: string,
    public readonly action: string,
    public readonly closedQuantity: Decimal | null,
    public readonly closeAveragePrice: Decimal | null,
    public readonly openedQuantity: Decimal | null,
    public readonly openAveragePrice: Decimal | null,
    public readonly stopLossPrice: Decimal | null,
    public readonly takeProfitPrice: Decimal | null,
    public readonly protectionMissing: boolean,
    public readonly reason: string,
    /** 以下是開倉那一張限價進場單；沒有進場單的那一輪都沒有。 */
    public readonly referencePrice: Decimal | null = null,
    public readonly entrySlippageTolerancePercentage: Decimal | null = null,
    public readonly requestedQuantity: Decimal | null = null,
    public readonly entryLimitPrice: Decimal | null = null,
    /** `working`／`filled`／`partiallyFilled`／`unfilled`；還沒掛出去是空字串。 */
    public readonly entryStatus: string = '',
    public readonly entryExecutedQuantity: Decimal | null = null,
    /** 對擁有者不利為正。 */
    public readonly entrySlippagePercentage: Decimal | null = null,
  ) {}

  toDomain(): ContractAutoOrderResultDomain {
    return new ContractAutoOrderResultDomain(this)
  }
}
