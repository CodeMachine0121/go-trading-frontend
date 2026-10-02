import type { DisplayLanguageApplication } from '~/application/display-language-application'
import type { DisplayLanguageDto } from '~/domain/models/dto/display-language-dto'

/**
 * 整個操作台共用的一份顯示語言。
 *
 * 目前語言的真相只有一個：翻譯實例的 locale。這裡只負責**寫**它——還原、選定——
 * 並讓整份頁面宣告同一個語言，朗讀工具才念得對。頂列與設定頁看的是同一個 locale，
 * 所以兩個入口永遠一致。
 */
export function useDisplayLanguage(
  displayLanguageApplication: DisplayLanguageApplication = useNuxtApp().$displayLanguageApplication,
) {
  const { locale } = useNuxtApp().$globalTranslation

  const selectableLanguages = displayLanguageApplication.listSelectableLanguages()

  function apply(language: DisplayLanguageDto): void {
    locale.value = language.code
    document.documentElement.lang = language.code
  }

  /** 讀回記住的語言（或瀏覽器偏好）並套上。根元件在第一個畫面之前叫它一次。 */
  function initializeDisplayLanguage(): void {
    apply(displayLanguageApplication.restoreSelectedLanguage())
  }

  function selectLanguage(code: string): void {
    apply(displayLanguageApplication.selectLanguage(code))
  }

  return {
    selectableLanguages,
    selectedLanguageCode: computed(() => locale.value),
    initializeDisplayLanguage,
    selectLanguage,
  }
}
