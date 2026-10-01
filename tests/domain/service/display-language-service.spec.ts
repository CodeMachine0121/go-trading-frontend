import { describe, expect, it, vi } from 'vitest'
import { DisplayLanguageService } from '~/domain/service/display-language-service'
import type { IDisplayLanguagePreferenceProxy } from '~/domain/interface/i-display-language-preference-proxy'

function buildProxy(
  rememberedCode: string | null = null,
  browserLanguageTags: readonly string[] = [],
): IDisplayLanguagePreferenceProxy {
  return {
    readSelectedLanguageCode: vi.fn().mockReturnValue(rememberedCode),
    writeSelectedLanguageCode: vi.fn(),
    readBrowserLanguageTags: vi.fn().mockReturnValue(browserLanguageTags),
  }
}

describe('DisplayLanguageService', () => {
  describe('listSelectableLanguages', () => {
    it('列出繁體中文與 English，各自用自己的語言寫名字，繁體中文在前', () => {
      const displayLanguageService = new DisplayLanguageService(buildProxy())

      const selectableLanguages = displayLanguageService.listSelectableLanguages()

      expect(selectableLanguages.map(language => [language.code, language.nativeName]))
        .toEqual([['zh-TW', '繁體中文'], ['en', 'English']])
    })
  })

  describe('restoreSelectedLanguage', () => {
    it.each([
      { description: '上次選的是 English', rememberedCode: 'en', browserLanguageTags: ['zh-TW'], expected: 'en' },
      { description: '沒選過且瀏覽器偏好英文', rememberedCode: null, browserLanguageTags: ['en-US', 'zh-TW'], expected: 'en' },
      { description: '沒選過且瀏覽器偏好英式英文', rememberedCode: null, browserLanguageTags: ['en-GB'], expected: 'en' },
      { description: '沒選過且瀏覽器偏好繁體中文', rememberedCode: null, browserLanguageTags: ['zh-TW', 'en'], expected: 'zh-TW' },
      { description: '沒選過且瀏覽器偏好日文', rememberedCode: null, browserLanguageTags: ['ja-JP', 'en'], expected: 'zh-TW' },
      { description: '沒選過且瀏覽器沒給任何偏好', rememberedCode: null, browserLanguageTags: [], expected: 'zh-TW' },
      { description: '記住的看不懂且瀏覽器偏好英文', rememberedCode: 'fr', browserLanguageTags: ['en-AU'], expected: 'en' },
      { description: '記住繁體中文但瀏覽器偏好英文', rememberedCode: 'zh-TW', browserLanguageTags: ['en-US'], expected: 'zh-TW' },
    ])('$description 時是 $expected', ({ rememberedCode, browserLanguageTags, expected }) => {
      const displayLanguageService = new DisplayLanguageService(
        buildProxy(rememberedCode, browserLanguageTags))

      expect(displayLanguageService.restoreSelectedLanguage().code).toBe(expected)
    })
  })

  describe('selectLanguage', () => {
    it.each([
      { code: 'en', expected: 'en' },
      { code: 'zh-TW', expected: 'zh-TW' },
      { code: 'klingon', expected: 'zh-TW' },
    ])('選 $code 得到並記住 $expected', ({ code, expected }) => {
      const displayLanguagePreferenceProxy = buildProxy()
      const displayLanguageService = new DisplayLanguageService(displayLanguagePreferenceProxy)

      expect(displayLanguageService.selectLanguage(code).code).toBe(expected)
      expect(displayLanguagePreferenceProxy.writeSelectedLanguageCode).toHaveBeenCalledWith(expected)
    })
  })
})
