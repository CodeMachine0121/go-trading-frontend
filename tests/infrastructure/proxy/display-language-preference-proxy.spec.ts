import { afterEach, describe, expect, it, vi } from 'vitest'
import { DisplayLanguagePreferenceProxy } from '~/infrastructure/proxy/display-language-preference-proxy'

describe('DisplayLanguagePreferenceProxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('寫進去的語言讀得回來', () => {
    const displayLanguagePreferenceProxy = new DisplayLanguagePreferenceProxy()

    displayLanguagePreferenceProxy.writeSelectedLanguageCode('en')

    expect(displayLanguagePreferenceProxy.readSelectedLanguageCode()).toBe('en')
  })

  it('瀏覽器記不住時，讀回 null、寫入安靜略過', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    })
    const displayLanguagePreferenceProxy = new DisplayLanguagePreferenceProxy()

    expect(() => displayLanguagePreferenceProxy.writeSelectedLanguageCode('en')).not.toThrow()
    expect(displayLanguagePreferenceProxy.readSelectedLanguageCode()).toBeNull()
  })

  it('讀出瀏覽器偏好的語言，依偏好先後', () => {
    vi.stubGlobal('navigator', { languages: ['en-AU', 'zh-TW'] })

    expect(new DisplayLanguagePreferenceProxy().readBrowserLanguageTags()).toEqual(['en-AU', 'zh-TW'])
  })

  it('瀏覽器沒給偏好時是空的', () => {
    vi.stubGlobal('navigator', {})

    expect(new DisplayLanguagePreferenceProxy().readBrowserLanguageTags()).toEqual([])
  })
})
