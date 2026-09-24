import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppearancePreferenceProxy } from '~/infrastructure/proxy/appearance-preference-proxy'

describe('AppearancePreferenceProxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('寫進去的選擇讀得回來', () => {
    const appearancePreferenceProxy = new AppearancePreferenceProxy()

    appearancePreferenceProxy.writeAppearanceChoice('light')

    expect(appearancePreferenceProxy.readAppearanceChoice()).toBe('light')
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
    const appearancePreferenceProxy = new AppearancePreferenceProxy()

    expect(() => appearancePreferenceProxy.writeAppearanceChoice('dark')).not.toThrow()
    expect(appearancePreferenceProxy.readAppearanceChoice()).toBeNull()
  })
})
