import type { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'

/**
 * DTO：積木抽屜這一刻的整個樣子。
 *
 * 兩類分開列，因為它們是兩種東西：比對是「讀哪一個來源」，群組是「怎麼合併」。
 * 混成一排的話，來源多起來時群組那兩塊會被推到看不見的地方，
 * 而群組是使用者每拼一層都要用到的。
 */
export class ConditionBlockDrawerDto {
  constructor(
    /** 每一個已宣告的來源各一塊。 */
    public readonly comparisons: readonly ConditionBlockOptionDto[],
    /** 全部成立與任一成立。 */
    public readonly groups: readonly ConditionBlockOptionDto[],
    /**
     * 抽屜自己要說的那一句，沒有話說時為空字串。
     *
     * 目前唯一會說話的情況是**一個來源都還沒宣告**：那時比對那一類是空的，
     * 而一個空著的分類看起來像壞了，不像「你還沒給我材料」。
     */
    public readonly hint: string,
  ) {}
}
