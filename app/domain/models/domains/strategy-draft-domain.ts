import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'

/**
 * Domain Model：畫面上這一份東西，跟載入當下那一份比，改過了沒有。
 *
 * 這條判斷錯的兩種後果不對稱：**該問卻不問會弄丟使用者寫的東西，
 * 不該問卻問只是煩人**。所以還沒載入過任何策略時，只要內容不是空白就算「有東西可弄丟」——
 * 那些字一樣是使用者寫的。
 */
export class StrategyDraftDomain {
  constructor(
    private readonly loadedContent: StrategyContentDto | null,
    private readonly currentContent: StrategyContentDto,
  ) {}

  hasUnsavedChanges(): boolean {
    if (this.loadedContent === null) {
      return this.currentContent.scriptBody.trim() !== ''
    }

    return this.currentContent.scriptBody !== this.loadedContent.scriptBody
      || this.currentContent.resultType !== this.loadedContent.resultType
      || this.currentContent.aggregationInterval !== this.loadedContent.aggregationInterval
      || this.currentContent.candleCount !== this.loadedContent.candleCount
  }
}
