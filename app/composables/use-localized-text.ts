import { getCurrentInstance, type Ref } from 'vue'
import { useI18n, type NamedValue } from 'vue-i18n'
import { DISPLAY_LANGUAGE_CODES, type DisplayLanguageCodeVo } from '~/domain/models/vo/display-language-code-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 畫面層說話的唯一入口：照目前的顯示語言挑說法（`localize`），
 * 以及把語言目錄裡的一句話取成兩種說法都帶著的 `LocalizedTextVo`（`translatedText`）。
 *
 * 「目前語言」唯一的真相是翻譯實例的 locale。在元件的 setup 裡取元件看得到的那一份
 * （元件測試不必啟動 Nuxt）；元件以外（middleware、composable 測試）取組裝根裝好的那一份。
 */
export function useLocalizedText() {
  const translation = getCurrentInstance() === null
    ? useNuxtApp().$globalTranslation
    : useI18n({ useScope: 'global' })
  const translate: (key: string, named: NamedValue, options: { locale: DisplayLanguageCodeVo }) => string
    = translation.t
  const locale: Ref<string> = translation.locale

  const currentLanguage = computed<DisplayLanguageCodeVo>(
    () => DISPLAY_LANGUAGE_CODES.find(code => code === locale.value) ?? DISPLAY_LANGUAGE_CODES[0])

  /** 沒有話要說（`null`）就是空字串，畫面不必每一處自己判斷一次。在渲染當下才挑，換語言時跟著換。 */
  function localize(text: LocalizedTextVo | null | undefined): string {
    return text === null || text === undefined ? '' : text.in(currentLanguage.value)
  }

  /**
   * 要留在狀態裡、稍後才畫的話（公告、錯誤說明、預設值）：存成一段字的話它就停在存下那一刻的語言，
   * 所以兩種說法一起取。字一律寫在語言目錄裡——畫面層不自己 `new LocalizedTextVo(...)`。
   * 帶入的值兩種語言通常是同一個；寫法隨語言而變的（例如時刻）給一個依語言回答的函式。
   */
  function translatedText(
    key: string,
    named: NamedValue | ((language: DisplayLanguageCodeVo) => NamedValue) = {},
  ): LocalizedTextVo {
    const namedIn = (language: DisplayLanguageCodeVo) => typeof named === 'function' ? named(language) : named

    return new LocalizedTextVo(
      translate(key, namedIn('zh-TW'), { locale: 'zh-TW' }),
      translate(key, namedIn('en'), { locale: 'en' }),
    )
  }

  return { currentLanguage, localize, translatedText }
}
