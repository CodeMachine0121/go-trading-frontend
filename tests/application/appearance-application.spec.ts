import { describe, expect, it, vi } from 'vitest'
import { AppearanceApplication } from '~/application/appearance-application'
import { AppearanceService } from '~/domain/service/appearance-service'
import type { IAppearancePreferenceProxy } from '~/domain/interface/i-appearance-preference-proxy'

function appearanceApplicationRemembering(rememberedChoice: string | null) {
  const appearancePreferenceProxy: IAppearancePreferenceProxy = {
    readAppearanceChoice: vi.fn(() => rememberedChoice),
    writeAppearanceChoice: vi.fn(),
  }

  return {
    appearancePreferenceProxy,
    appearanceApplication: new AppearanceApplication(new AppearanceService(appearancePreferenceProxy)),
  }
}

describe('AppearanceApplication 還原外觀', () => {
  it.each([
    { name: '沒選過、系統是深色 → 跟隨系統的深色', remembered: null, systemPrefersDark: true, choice: 'system', theme: 'dark' },
    { name: '沒選過、系統是淺色 → 跟隨系統的淺色', remembered: null, systemPrefersDark: false, choice: 'system', theme: 'light' },
    { name: '選過淺色、系統是深色 → 仍是淺色', remembered: 'light', systemPrefersDark: true, choice: 'light', theme: 'light' },
    { name: '選過深色、系統是淺色 → 仍是深色', remembered: 'dark', systemPrefersDark: false, choice: 'dark', theme: 'dark' },
    { name: '記住的是看不懂的值 → 跟隨系統', remembered: 'sepia', systemPrefersDark: true, choice: 'system', theme: 'dark' },
  ])('$name', ({ remembered, systemPrefersDark, choice, theme }) => {
    const { appearanceApplication } = appearanceApplicationRemembering(remembered)

    const appearance = appearanceApplication.restoreAppearance(systemPrefersDark)

    expect(appearance.choice).toBe(choice)
    expect(appearance.resolvedTheme).toBe(theme)
  })

  it('三個選項依淺色、跟隨系統、深色排列', () => {
    const { appearanceApplication } = appearanceApplicationRemembering(null)

    const { options } = appearanceApplication.restoreAppearance(true)

    expect(options.map(option => [option.value, option.label])).toEqual([
      ['light', '淺色'], ['system', '跟隨系統'], ['dark', '深色'],
    ])
  })
})

describe('AppearanceApplication 選擇外觀', () => {
  it.each([
    { name: '選淺色就記住淺色', selected: 'light', remembered: 'light', theme: 'light' },
    { name: '選跟隨系統就記住跟隨系統', selected: 'system', remembered: 'system', theme: 'dark' },
    { name: '選了看不懂的值 → 記住的是跟隨系統', selected: 'sepia', remembered: 'system', theme: 'dark' },
  ])('$name', ({ selected, remembered, theme }) => {
    const { appearanceApplication, appearancePreferenceProxy } = appearanceApplicationRemembering(null)

    const appearance = appearanceApplication.selectAppearance(selected, true)

    expect(appearancePreferenceProxy.writeAppearanceChoice).toHaveBeenCalledWith(remembered)
    expect(appearance.resolvedTheme).toBe(theme)
  })
})

describe('AppearanceApplication 系統的深淺換了', () => {
  it.each([
    { name: '跟隨系統時跟著換成淺色', choice: 'system', systemPrefersDark: false, theme: 'light' },
    { name: '選了深色時不跟著換', choice: 'dark', systemPrefersDark: false, theme: 'dark' },
  ])('$name', ({ choice, systemPrefersDark, theme }) => {
    const { appearanceApplication, appearancePreferenceProxy } = appearanceApplicationRemembering(null)

    const appearance = appearanceApplication.resolveAppearance(choice, systemPrefersDark)

    expect(appearance.resolvedTheme).toBe(theme)
    expect(appearancePreferenceProxy.writeAppearanceChoice).not.toHaveBeenCalled()
  })
})
