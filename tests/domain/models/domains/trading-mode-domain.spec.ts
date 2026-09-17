import { describe, expect, it } from 'vitest'
import { TradingModeDomain } from '~/domain/models/domains/trading-mode-domain'
import { DEFAULT_TRADING_MODE, TRADING_MODES } from '~/domain/models/vo/trading-mode-vo'

describe('TradingModeDomain', () => {
  it('兩種模式，既有的那一種排第一', () => {
    // 排第一的是預設的那一個：使用者的眼睛先落在他本來就會拿到的答案上。
    expect(TRADING_MODES).toEqual(['longShort', 'spot'])
  })

  it('預設是既有的那一種', () => {
    // 預設值的職責是讓舊的東西繼續成立，不是「比較常見的那一個」。
    expect(DEFAULT_TRADING_MODE).toBe('longShort')
  })

  it('多空反手說得出它拿賣出信號做什麼', () => {
    const option = new TradingModeDomain('longShort').toOptionDto()

    expect(option.value).toBe('longShort')
    expect(option.label).toBe('多空反手')
    // 「多空反手」是個名詞。使用者要決定的是行為：賣出的時候你要幫我放空，還是把錢還我。
    expect(option.description).toContain('反手做空')
  })

  it('現貨說得出它拿賣出信號做什麼', () => {
    const option = new TradingModeDomain('spot').toOptionDto()

    expect(option.value).toBe('spot')
    expect(option.label).toBe('現貨')
    expect(option.description).toContain('平倉')
    expect(option.description).toContain('不放空')
  })

  it('每一種都說得出一句話，沒有一種留白', () => {
    for (const mode of TRADING_MODES) {
      const option = new TradingModeDomain(mode).toOptionDto()

      expect(option.label).not.toBe('')
      expect(option.description).not.toBe('')
    }
  })
})
