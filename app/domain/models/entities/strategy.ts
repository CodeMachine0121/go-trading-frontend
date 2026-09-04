import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyDomain } from '~/domain/models/domains/strategy-domain'

/**
 * Entity：後端那一支策略的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * `script` 是**一整段算式**（外框加內容），與後端存的一模一樣。
 * 把它拆回使用者寫的那幾行是領域行為，住在 StrategyDomain。
 *
 * 它記著的只有算法本身。要多粗的 K 線、要幾根、在哪個市場上算，都不在這裡——
 * 那些描述的是**某一次執行**，跟著計算的請求走，同一支策略因此能反覆用在不同條件上。
 */
export class Strategy {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly script: string,
    public readonly resultType: string,
    /** 這支算式自己的旋鈕，與後端存的一模一樣。 */
    public readonly parameters: readonly StrategyParameterDto[] = [],
  ) {}

  toDomain(): StrategyDomain {
    return new StrategyDomain(this)
  }
}
