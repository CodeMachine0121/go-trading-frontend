import { describe, expect, it } from 'vitest'
import { buildTradingSymbol } from '../../../fixtures/trading-symbol-application'

describe('TradingSymbol 怎麼被唸出來', () => {
  it('有名字就把名字接在代號後面', () => {
    // 一份全是四位數字的清單，沒有人掃一眼就讀得懂。
    const tradingSymbolDto = buildTradingSymbol(
      '2330', { market: 'taiwanStock', displayName: '台積電' }).toDto()

    expect(tradingSymbolDto.label).toBe('2330 台積電')
    expect(tradingSymbolDto.displayName).toBe('台積電')
  })

  it('沒有名字就只有代號，不留一個多出來的空格', () => {
    // 不取名字的市場（加密貨幣）代號本身就是名字。
    const tradingSymbolDto = buildTradingSymbol('BTCUSDT').toDto()

    expect(tradingSymbolDto.label).toBe('BTCUSDT')
    expect(tradingSymbolDto.displayName).toBe('')
  })
})
