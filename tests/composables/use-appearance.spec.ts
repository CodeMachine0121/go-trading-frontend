// @vitest-environment nuxt
// 外觀跨畫面共用一份（useState），需要 Nuxt runtime 才問得到它。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppearance } from '~/composables/use-appearance'
import { AppearanceApplication } from '~/application/appearance-application'
import { AppearanceService } from '~/domain/service/appearance-service'
import type { IAppearancePreferenceProxy } from '~/domain/interface/i-appearance-preference-proxy'

/** 系統的深淺是瀏覽器的邊界：換成一個可以自己撥動的替身。 */
function systemPreferring(dark: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = []
  const mediaQuery = {
    matches: dark,
    addEventListener: vi.fn((_type: string, listener: (event: { matches: boolean }) => void) => listeners.push(listener)),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))

  return {
    switchTo(nextDark: boolean) {
      mediaQuery.matches = nextDark
      listeners.forEach(listener => listener({ matches: nextDark }))
    },
  }
}

function appearanceRemembering(rememberedChoice: string | null) {
  const appearancePreferenceProxy: IAppearancePreferenceProxy = {
    readAppearanceChoice: vi.fn(() => rememberedChoice),
    writeAppearanceChoice: vi.fn(),
  }

  return useAppearance(new AppearanceApplication(new AppearanceService(appearancePreferenceProxy)))
}

describe('useAppearance', () => {
  beforeEach(() => {
    clearNuxtState()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.theme
  })

  it('一打開就把實際的主題寫在頁面上', () => {
    systemPreferring(true)

    appearanceRemembering(null).initializeAppearance()

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('跟隨系統時，系統一換，畫面當下跟著換', () => {
    const system = systemPreferring(true)
    const appearance = appearanceRemembering('system')
    appearance.initializeAppearance()

    system.switchTo(false)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(appearance.appearance.value?.choice).toBe('system')
  })

  it('選了深色時，系統換成淺色也不跟著換', () => {
    const system = systemPreferring(true)
    appearanceRemembering('dark').initializeAppearance()

    system.switchTo(false)

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('選了淺色就立刻換上，兩個入口看到的是同一份', () => {
    systemPreferring(true)
    const topStrip = appearanceRemembering(null)
    topStrip.initializeAppearance()

    topStrip.selectAppearance('light')

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(appearanceRemembering(null).appearance.value?.choice).toBe('light')
  })
})
