import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'

/**
 * DTO：市集清單上的一列——那一支策略，加上**它對現在這個人是什麼**。
 *
 * 那兩個問題（是我分享的嗎、我收下過了嗎）決定那一列給哪一顆按鈕，而它們不是策略本身
 * 的性質：同一支策略對不同的人有不同的答案。所以它們在這裡，而不是在策略身上。
 *
 * 它存在是為了讓畫面不必自己比對兩份識別碼清單。那種比對每多一處就多一個會悄悄算錯的
 * 地方，而算錯的後果是給人一顆按不動的按鈕。
 */
export class MarketplaceListingRowDto {
  constructor(
    public readonly strategy: PublishedStrategyDto,
    /** 這一支是不是自己分享出去的。是的話一顆按鈕都不給——它本來就在自己清單裡。 */
    public readonly mine: boolean,
    /** 這一支已經在自己的清單上了嗎。決定那顆按鈕是「加入」還是「移除」。 */
    public readonly adopted: boolean,
  ) {}
}
