import { DisplayLanguageDomain } from '~/domain/models/domains/display-language-domain'
import type { DisplayLanguageCodeVo } from '~/domain/models/vo/display-language-code-vo'

/**
 * Entity：一個可選的顯示語言。名字用它自己的語言寫——看不懂目前語言的人也認得出自己的那一個。
 * 認領的瀏覽器語言標籤以主語言比對（`en` 認領 `en-US`、`en-GB`…）。
 */
export class DisplayLanguage {
  constructor(
    public readonly code: DisplayLanguageCodeVo,
    public readonly nativeName: string,
    public readonly primaryLanguageSubtag: string,
  ) {}

  toDomain(): DisplayLanguageDomain {
    return new DisplayLanguageDomain(this)
  }
}
