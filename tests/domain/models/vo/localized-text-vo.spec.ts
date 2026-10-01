import { describe, expect, it } from 'vitest'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

describe('LocalizedTextVo', () => {
  it.each([
    { language: 'zh-TW' as const, expected: '開盤價必須填寫' },
    { language: 'en' as const, expected: 'Open price is required' },
  ])('在 $language 說成 $expected', ({ language, expected }) => {
    expect(new LocalizedTextVo('開盤價必須填寫', 'Open price is required').in(language)).toBe(expected)
  })
})
