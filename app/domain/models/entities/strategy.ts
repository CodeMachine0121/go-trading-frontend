import { StrategyDomain } from '~/domain/models/domains/strategy-domain'

/**
 * Entity：後端那一支策略的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * `script` 是**一整段算式**（外框加內容），與後端存的一模一樣。
 * 把它拆回使用者寫的那幾行是領域行為，住在 StrategyDomain。
 */
export class Strategy {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly script: string,
    public readonly resultType: string,
    public readonly aggregationInterval: string,
    public readonly candleCount: number,
  ) {}

  toDomain(): StrategyDomain {
    return new StrategyDomain(this)
  }
}
