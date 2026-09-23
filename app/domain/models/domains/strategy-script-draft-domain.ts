import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptParametersDomain } from '~/domain/models/domains/strategy-script-parameters-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

/**
 * Domain Model：畫面上這一份東西，跟載入當下那一份比，改過了沒有。
 *
 * 這條判斷錯的兩種後果不對稱：**該問卻不問會弄丟使用者寫的東西，
 * 不該問卻問只是煩人**。所以還沒載入過任何策略腳本時，只要內容不是空白就算「有東西可弄丟」——
 * 那些字一樣是使用者寫的。
 *
 * 反過來說，比對的範圍就是策略腳本記著的範圍，一分不多。旋鈕在裡面——它是那套算法的一部分，
 * 宣告了卻不算數，使用者剛排好的那幾格就會被下一次載入靜靜蓋掉。
 * 彙總刻度與要看多長仍然不在裡面：它們不屬於任何一支策略腳本，改了沒有東西會被弄丟，
 * 為此跳一個確認只會讓使用者學會無視那個對話框——而它在真正要緊的時候必須被讀。
 */
export class StrategyScriptDraftDomain {
  constructor(
    private readonly loadedContent: StrategyScriptContentDto | null,
    private readonly currentContent: StrategyScriptContentDto,
  ) {}

  hasUnsavedChanges(): boolean {
    if (this.loadedContent === null) {
      return !this.isUntouchedDraft() || this.currentContent.parameters.length > 0
    }

    return this.currentContent.script !== this.loadedContent.script
      || this.currentContent.resultType !== this.loadedContent.resultType
      || !new StrategyScriptParametersDomain(this.currentContent.parameters)
        .isSameAs(new StrategyScriptParametersDomain(this.loadedContent.parameters))
  }

  /**
   * 還沒載入過策略腳本時，「沒有東西可弄丟」的兩種樣子：完全空白，或該種類**未改動**的
   * 預填內容。預填的那一份（開頭那幾行加一個空的進入點）是系統填的，不是使用者寫的——
   * 一個字都還沒改就再按一次不必問。反過來說，**只改了開頭也算改過**：
   * 那幾行現在也是使用者的。
   */
  private isUntouchedDraft(): boolean {
    const trimmedScript = this.currentContent.script.trim()
    if (trimmedScript === '') {
      return true
    }

    // 空白長什麼樣跟著這一份吃的行情走：合約那一頁預填的進入點收合約行情格，
    // 拿現貨的空白去比，一份沒碰過的合約草稿會被當成「有東西還沒存」。
    const blankScript = new IndicatorScriptDomain(
      new IndicatorResultTypeDomain(this.currentContent.resultType),
      new MarketDataKindDomain(this.currentContent.marketDataKind)).blankScript()

    return trimmedScript === blankScript.trim()
  }
}
