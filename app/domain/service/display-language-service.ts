import type { IDisplayLanguagePreferenceProxy } from '~/domain/interface/i-display-language-preference-proxy'
import { DisplayLanguage } from '~/domain/models/entities/display-language'
import type { DisplayLanguageDto } from '~/domain/models/dto/display-language-dto'

/**
 * 可選的顯示語言。第一個是預設，也是看不懂的代碼與不在清單上的瀏覽器偏好的退路——
 * 操作台原本就只說繁體中文。
 */
const SELECTABLE_DISPLAY_LANGUAGES = [
  // translation-exempt：每個語言都用它自己的語言自稱，不跟著顯示語言換。
  new DisplayLanguage('zh-TW', '繁體中文', 'zh'),
  new DisplayLanguage('en', 'English', 'en'),
]

/**
 * Domain Service：顯示語言的三個用例。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 */
export class DisplayLanguageService {
  constructor(private readonly displayLanguagePreferenceProxy: IDisplayLanguagePreferenceProxy) {}

  listSelectableLanguages(): DisplayLanguageDto[] {
    return SELECTABLE_DISPLAY_LANGUAGES.map(language => language.toDomain().toDto())
  }

  /**
   * 記住的（且在清單上）優先；沒有就看瀏覽器第一個偏好的語言；都不中就是繁體中文。
   * 繁體中文認領所有 `zh` 開頭的偏好，與退路是同一個答案。
   */
  restoreSelectedLanguage(): DisplayLanguageDto {
    const rememberedCode = this.displayLanguagePreferenceProxy.readSelectedLanguageCode()
    const browserLanguageTags = this.displayLanguagePreferenceProxy.readBrowserLanguageTags()
    const [defaultLanguage] = SELECTABLE_DISPLAY_LANGUAGES
    const restoredLanguage
      = SELECTABLE_DISPLAY_LANGUAGES.find(language => language.code === rememberedCode)
        ?? SELECTABLE_DISPLAY_LANGUAGES.find(
          language => language.toDomain().isPreferredBy(browserLanguageTags))
        ?? defaultLanguage

    return restoredLanguage.toDomain().toDto()
  }

  /** 選定一個語言並記住它。看不懂的代碼退回繁體中文，記住的也是退回後的那一個。 */
  selectLanguage(code: string): DisplayLanguageDto {
    const [defaultLanguage] = SELECTABLE_DISPLAY_LANGUAGES
    const selectedLanguage = SELECTABLE_DISPLAY_LANGUAGES.find(language => language.code === code)
      ?? defaultLanguage
    this.displayLanguagePreferenceProxy.writeSelectedLanguageCode(selectedLanguage.code)

    return selectedLanguage.toDomain().toDto()
  }
}
