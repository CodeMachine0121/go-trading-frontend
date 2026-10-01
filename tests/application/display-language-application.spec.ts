import { describe, expect, it, vi } from 'vitest'
import { DisplayLanguageApplication } from '~/application/display-language-application'
import { DisplayLanguageService } from '~/domain/service/display-language-service'
import type { IDisplayLanguagePreferenceProxy } from '~/domain/interface/i-display-language-preference-proxy'

// 只 mock 最外層的 proxy 介面；domain service 與 domain model 都是真的。
function buildRememberingProxy(browserLanguageTags: readonly string[]): IDisplayLanguagePreferenceProxy {
  const rememberedCodes: string[] = []

  return {
    readSelectedLanguageCode: vi.fn(() => rememberedCodes.at(-1) ?? null),
    writeSelectedLanguageCode: vi.fn((code: string) => {
      rememberedCodes.push(code)
    }),
    readBrowserLanguageTags: vi.fn(() => browserLanguageTags),
  }
}

describe('DisplayLanguageApplication', () => {
  it('選一個語言之後，下一次讀回的就是它，即使瀏覽器偏好別的', () => {
    const displayLanguageApplication = new DisplayLanguageApplication(
      new DisplayLanguageService(buildRememberingProxy(['en-US'])))

    displayLanguageApplication.selectLanguage('zh-TW')

    expect(displayLanguageApplication.restoreSelectedLanguage().code).toBe('zh-TW')
  })

  it('沒選過時照瀏覽器偏好', () => {
    const displayLanguageApplication = new DisplayLanguageApplication(
      new DisplayLanguageService(buildRememberingProxy(['en-US'])))

    expect(displayLanguageApplication.restoreSelectedLanguage().code).toBe('en')
  })

  it('列出可選的語言', () => {
    const displayLanguageApplication = new DisplayLanguageApplication(
      new DisplayLanguageService(buildRememberingProxy([])))

    expect(displayLanguageApplication.listSelectableLanguages().map(language => language.code))
      .toEqual(['zh-TW', 'en'])
  })
})
