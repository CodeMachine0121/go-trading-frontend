import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { StrategyScriptDomain } from '~/domain/models/domains/strategy-script-domain'

/**
 * Entity：後端那一支策略腳本的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * `script` 是**一整份算式**，與後端存的一模一樣——那也正是使用者當初在編輯器裡
 * 看到的那一份，從第一行到最後一行。沒有什麼要拆。
 *
 * 它記著的只有算法本身。要多粗的 K 線、要幾根、在哪個市場上算，都不在這裡——
 * 那些描述的是**某一次執行**，跟著計算的請求走，同一支策略腳本因此能反覆用在不同條件上。
 */
export class StrategyScript {
  constructor(
    public readonly id: number,
    public readonly name: string,
    /** 擁有者用自己的話寫的一段。沒寫時是空字串——分享出去之後，這是別人唯一的介紹。 */
    public readonly description: string,
    public readonly script: string,
    public readonly resultType: string,
    /** 這支算式自己的旋鈕，與後端存的一模一樣。 */
    public readonly parameters: readonly StrategyScriptParameterDto[] = [],
    /** 這一支在不在市集上。**只有自己的策略腳本答得出這個問題**——別人的那些一律在上面。 */
    public readonly published: boolean = false,
  ) {}

  toDomain(): StrategyScriptDomain {
    return new StrategyScriptDomain(this)
  }
}
