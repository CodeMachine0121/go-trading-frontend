import type { DisplayLanguage } from '~/domain/models/entities/display-language'
import { DisplayLanguageDto } from '~/domain/models/dto/display-language-dto'

/** Domain Model：判斷一個顯示語言是不是這台瀏覽器偏好的那一個。 */
export class DisplayLanguageDomain {
  constructor(private readonly displayLanguage: DisplayLanguage) {}

  /**
   * 只看**第一個**偏好：瀏覽器把英文排在第二位的人，第一個想看的仍是別的語言。
   * 比的是主語言（`en-AU` 的 `en`），大小寫不拘。
   */
  isPreferredBy(browserLanguageTags: readonly string[]): boolean {
    const [firstPreferredTag] = browserLanguageTags
    if (firstPreferredTag === undefined) {
      return false
    }

    const [primarySubtag] = firstPreferredTag.toLowerCase().split('-')

    return primarySubtag === this.displayLanguage.primaryLanguageSubtag
  }

  toDto(): DisplayLanguageDto {
    return new DisplayLanguageDto(this.displayLanguage.code, this.displayLanguage.nativeName)
  }
}
