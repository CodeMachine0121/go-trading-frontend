import { describe, expect, it } from 'vitest'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

describe('LocalizedTextVo', () => {
  it.each([
    { language: 'zh-TW' as const, expected: '開盤價必須填寫' },
    { language: 'en' as const, expected: 'Open price is required' },
  ])('在 $language 說成 $expected', ({ language, expected }) => {
    expect(new LocalizedTextVo('開盤價必須填寫', 'Open price is required').in(language)).toBe(expected)
  })

  it.each([
    { language: 'zh-TW' as const, expected: '現貨、合約' },
    { language: 'en' as const, expected: 'Spot, Contract' },
  ])('以自己為連接詞接成一句，在 $language 說成 $expected，沒有的那一段略過', ({ language, expected }) => {
    const joined = new LocalizedTextVo('、', ', ').join([
      new LocalizedTextVo('現貨', 'Spot'),
      null,
      new LocalizedTextVo('合約', 'Contract'),
    ])

    expect(joined.in(language)).toBe(expected)
  })
})
