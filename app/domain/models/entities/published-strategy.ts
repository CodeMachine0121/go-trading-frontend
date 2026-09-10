import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { PublishedStrategyDomain } from '~/domain/models/domains/published-strategy-domain'

/**
 * Entity：市集上的一支策略，如同系統交出來的樣子。
 *
 * **它沒有 `script` 欄位，那正是重點。** 分享出去的是一支策略的用處，不是它的作法——
 * 而「別人看不到算式」在這裡不是一條要遵守的規則，是一個沒有地方可以放算式的型別。
 * 想把它載進編輯器的那段程式碼**編不過**，不必靠審查抓。
 *
 * 它也沒有指標算式以外的取數計畫：要多粗、要幾根、在哪個市場上算，一律由執行當下指定。
 */
export class PublishedStrategy {
  constructor(
    public readonly id: number,
    public readonly name: string,
    /** 分享者用自己的話寫的一段。沒寫時是空字串——算式看不到的時候，這是唯一的介紹。 */
    public readonly description: string,
    public readonly resultType: string,
    /** 是誰把它放上市集的。 */
    public readonly publisherEmail: string,
    public readonly publishedAt: Date,
    /** 這支算式自己的旋鈕。宣告它們不會洩漏作法——一個旋鈕是一個名字與一個預設值，不是一個步驟。 */
    public readonly parameters: readonly StrategyParameterDto[] = [],
  ) {}

  toDomain(): PublishedStrategyDomain {
    return new PublishedStrategyDomain(this)
  }
}
