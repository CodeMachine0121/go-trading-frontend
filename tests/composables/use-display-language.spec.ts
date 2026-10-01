// @vitest-environment nuxt
// 顯示語言寫的是翻譯實例的 locale，要有 Nuxt runtime 裝好的那一份才問得到它。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDisplayLanguage } from '~/composables/use-display-language'
import { DisplayLanguageApplication } from '~/application/display-language-application'
import { DisplayLanguageService } from '~/domain/service/display-language-service'
import type { IDisplayLanguagePreferenceProxy } from '~/domain/interface/i-display-language-preference-proxy'

function displayLanguageRemembering(rememberedCode: string | null) {
  const displayLanguagePreferenceProxy: IDisplayLanguagePreferenceProxy = {
    readSelectedLanguageCode: vi.fn(() => rememberedCode),
    writeSelectedLanguageCode: vi.fn(),
    readBrowserLanguageTags: vi.fn(() => []),
  }

  return useDisplayLanguage(
    new DisplayLanguageApplication(new DisplayLanguageService(displayLanguagePreferenceProxy)))
}

describe('useDisplayLanguage', () => {
  afterEach(() => {
    useNuxtApp().$globalTranslation.locale.value = 'zh-TW'
    document.documentElement.lang = ''
  })

  it('一打開就套上記住的語言，整份頁面也宣告它', () => {
    const displayLanguage = displayLanguageRemembering('en')

    displayLanguage.initializeDisplayLanguage()

    expect(displayLanguage.selectedLanguageCode.value).toBe('en')
    expect(useNuxtApp().$globalTranslation.locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('換一個語言時當場套上', () => {
    const displayLanguage = displayLanguageRemembering(null)
    displayLanguage.initializeDisplayLanguage()

    displayLanguage.selectLanguage('en')

    expect(useNuxtApp().$globalTranslation.locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('看不懂的語言退回繁體中文', () => {
    const displayLanguage = displayLanguageRemembering(null)

    displayLanguage.selectLanguage('klingon')

    expect(displayLanguage.selectedLanguageCode.value).toBe('zh-TW')
    expect(document.documentElement.lang).toBe('zh-TW')
  })
})
