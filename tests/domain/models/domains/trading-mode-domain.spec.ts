import { describe, expect, it } from 'vitest'
import { TradingModeDomain } from '~/domain/models/domains/trading-mode-domain'
import { DEFAULT_TRADING_MODE, TRADING_MODES } from '~/domain/models/vo/trading-mode-vo'

describe('TradingModeDomain', () => {
  it('四種模式，既有的那一種排第一、新的接在最後', () => {
    // 排第一的是預設的那一個：使用者的眼睛先落在他本來就會拿到的答案上。
    // 新的一律接在最後，所以既有的每一個在畫面上一格都沒有移位——
    // 已經習慣位置的人不會因為多了一個選項而按錯。
    expect(TRADING_MODES).toEqual(['longShort', 'spot', 'leveragedLong', 'shortOnly'])
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

  it('槓桿做多說得出它與現貨差在哪', () => {
    const option = new TradingModeDomain('leveragedLong').toOptionDto()

    expect(option.value).toBe('leveragedLong')
    expect(option.label).toBe('槓桿做多')
    // 它與現貨只差一件事，而那件事就是使用者挑它的唯一理由。
    expect(option.description).toContain('只做多')
    expect(option.description).toContain('槓桿')
  })

  it('只做空說得出哪個信號開倉、哪個信號平倉', () => {
    const option = new TradingModeDomain('shortOnly').toOptionDto()

    expect(option.value).toBe('shortOnly')
    expect(option.label).toBe('只做空')
    // 方向要釘死。挑了這個模式之後最容易害到人的，是「哪個信號開倉」寫反——
    // 而只斷言「只做空」（與 label 同字）與「不做多」的話，把說明改成
    // 「買入開空倉、賣出平倉」照樣會綠，那正好是反的。
    expect(option.description).toContain('賣出就開空倉')
    expect(option.description).toContain('買入是平倉')
    expect(option.description).toContain('不做多')
    // 它與「不能放空的帳戶」的關鍵差別。
    expect(option.description).toContain('借得到錢')
  })

  it('做不了空不代表借不到錢，做得了空則一定借得到', () => {
    // 兩個各自獨立的問題。比對模式名稱會把槓桿做多歸到現貨那一邊，而且不報錯。
    expect(new TradingModeDomain('longShort').canUseLeverage()).toBe(true)
    expect(new TradingModeDomain('spot').canUseLeverage()).toBe(false)
    expect(new TradingModeDomain('leveragedLong').canUseLeverage()).toBe(true)
    // 不是給它的方便：放空本來就要先借到東西才賣得出去。
    expect(new TradingModeDomain('shortOnly').canUseLeverage()).toBe(true)
  })

  it('每一種都說得出一句話，沒有一種留白', () => {
    for (const mode of TRADING_MODES) {
      const option = new TradingModeDomain(mode).toOptionDto()

      expect(option.label).not.toBe('')
      expect(option.description).not.toBe('')
    }
  })
})
