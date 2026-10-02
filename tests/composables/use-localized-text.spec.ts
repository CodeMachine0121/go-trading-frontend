// @vitest-environment nuxt
// 取的是組裝根裝好的那一份翻譯實例，需要 Nuxt runtime。
import { afterEach, describe, expect, it } from 'vitest'
import { useLocalizedText } from '~/composables/use-localized-text'

describe('useLocalizedText', () => {
  it.each([
    { language: 'zh-TW' as const, expected: '歷史對話（3）' },
    { language: 'en' as const, expected: 'Conversation history (3)' },
  ])('同一句話兩種說法都帶著，帶入的值兩邊都換上（$language）', ({ language, expected }) => {
    const { translatedText } = useLocalizedText()

    expect(translatedText('assistant.console.historyWithCount', { count: 3 }).in(language)).toBe(expected)
  })
})

describe('useLocalizedText：照目前的語言取一次', () => {
  afterEach(() => {
    useNuxtApp().$globalTranslation.locale.value = 'zh-TW'
  })

  it.each([
    { language: 'zh-TW' as const, expected: '來源1' },
    { language: 'en' as const, expected: 'Source 1' },
  ])('新信號來源的預設代號照建立當下的語言（$language）', ({ language, expected }) => {
    useNuxtApp().$globalTranslation.locale.value = language
    const { currentLanguage, translatedText } = useLocalizedText()

    expect(translatedText('tradingStrategy.form.defaultSignalSourceLabel', { number: 1 }).in(currentLanguage.value))
      .toBe(expected)
  })
})
