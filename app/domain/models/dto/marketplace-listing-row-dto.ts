import type { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'

/**
 * DTO：市集清單上的一列——那一支策略腳本，加上**它對現在這個人是什麼**。
 *
 * 「是我分享的嗎」決定那一列給不給「加入」，而它不是策略腳本本身的性質：同一支策略腳本對不同
 * 的人有不同的答案。加入是複製一份，副本與這一支對不起來，所以沒有「已加入」這一問。
 *
 * 它存在是為了讓畫面不必自己比對兩份識別碼清單。那種比對每多一處就多一個會悄悄算錯的
 * 地方，而算錯的後果是給人一顆按不動的按鈕。
 */
export class MarketplaceListingRowDto {
  constructor(
    public readonly strategyScript: PublishedStrategyScriptDto,
    /** 這一支是不是自己分享出去的。是的話一顆按鈕都不給——它本來就在自己清單裡。 */
    public readonly mine: boolean,
  ) {}
}
