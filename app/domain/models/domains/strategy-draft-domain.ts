import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'

/**
 * Domain Model：畫面上這一份東西，跟載入當下那一份比，改過了沒有。
 *
 * 這條判斷錯的兩種後果不對稱：**該問卻不問會弄丟使用者寫的東西，
 * 不該問卻問只是煩人**。所以還沒載入過任何策略時，只要內容不是空白就算「有東西可弄丟」——
 * 那些字一樣是使用者寫的。
 *
 * 反過來說，比對的範圍就是策略記著的範圍，一分不多。旋鈕在裡面——它是那套算法的一部分，
 * 宣告了卻不算數，使用者剛排好的那幾格就會被下一次載入靜靜蓋掉。
 * 彙總刻度與要看多長仍然不在裡面：它們不屬於任何一支策略，改了沒有東西會被弄丟，
 * 為此跳一個確認只會讓使用者學會無視那個對話框——而它在真正要緊的時候必須被讀。
 */
export class StrategyDraftDomain {
  constructor(
    private readonly loadedContent: StrategyContentDto | null,
    private readonly currentContent: StrategyContentDto,
  ) {}

  hasUnsavedChanges(): boolean {
    if (this.loadedContent === null) {
      return this.currentContent.scriptBody.trim() !== ''
        || this.currentContent.parameters.length > 0
    }

    return this.currentContent.scriptBody !== this.loadedContent.scriptBody
      || this.currentContent.resultType !== this.loadedContent.resultType
      || !new StrategyParametersDomain(this.currentContent.parameters)
        .isSameAs(new StrategyParametersDomain(this.loadedContent.parameters))
  }
}
