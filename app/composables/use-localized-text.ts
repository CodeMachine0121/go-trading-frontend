import { useI18n } from 'vue-i18n'
import { DISPLAY_LANGUAGE_CODES, type DisplayLanguageCodeVo } from '~/domain/models/vo/display-language-code-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 把領域說出來的話照目前的顯示語言挑一種說法。
 *
 * 只依賴翻譯實例的 locale——那是「目前語言」唯一的真相——所以在渲染當下才挑，
 * 換語言時已經顯示的話跟著換；元件測試也不必啟動 Nuxt。
 */
export function useLocalizedText() {
  const { locale } = useI18n()

  const currentLanguage = computed<DisplayLanguageCodeVo>(
    () => DISPLAY_LANGUAGE_CODES.find(code => code === locale.value) ?? DISPLAY_LANGUAGE_CODES[0])

  /** 沒有話要說（`null`）就是空字串，畫面不必每一處自己判斷一次。 */
  function localize(text: LocalizedTextVo | null | undefined): string {
    return text === null || text === undefined ? '' : text.in(currentLanguage.value)
  }

  return { localize }
}
