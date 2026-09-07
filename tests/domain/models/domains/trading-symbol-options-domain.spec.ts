import { describe, expect, it } from 'vitest'
import { TradingSymbolOptionsDomain } from '~/domain/models/domains/trading-symbol-options-domain'
import { buildTradingSymbol } from '../../../fixtures/trading-symbol-application'

function listing(...symbols: [string, 'taiwanStock' | 'crypto'][]) {
  return symbols.map(([symbol, market]) => buildTradingSymbol(symbol, { market }).toDto())
}

function namesOf(tradingSymbols: readonly { symbol: string }[]) {
  return tradingSymbols.map(tradingSymbol => tradingSymbol.symbol)
}

describe('TradingSymbolOptionsDomain', () => {
  const LISTING = listing(['2330', 'taiwanStock'], ['2454', 'taiwanStock'], ['BTCUSDT', 'crypto'])

  it('不篩時全部都列出來', () => {
    const options = new TradingSymbolOptionsDomain(LISTING, '2330').optionsFor(null)

    expect(namesOf(options)).toEqual(['2330', '2454', 'BTCUSDT'])
  })

  it('只看某一個市場時只留那個市場的', () => {
    const options = new TradingSymbolOptionsDomain(LISTING, '2330').optionsFor('taiwanStock')

    expect(namesOf(options)).toEqual(['2330', '2454'])
  })

  it('別的市場的那一檔即使正選著也不列出來', () => {
    // 混一檔別的市場進來，這個市場鍵就不再是「只看台股」。
    const options = new TradingSymbolOptionsDomain(LISTING, 'BTCUSDT').optionsFor('taiwanStock')

    expect(namesOf(options)).toEqual(['2330', '2454'])
  })

  it('選著的那一檔就在這個市場裡時不動它', () => {
    // 他只是換個角度看同一份清單，沒有理由把他正在看的東西換掉。
    const selected = new TradingSymbolOptionsDomain(LISTING, '2454').selectionFor('taiwanStock')

    expect(selected).toBe('2454')
  })

  it('選著的那一檔不屬於這個市場時，改選這個市場的第一檔', () => {
    const selected = new TradingSymbolOptionsDomain(LISTING, 'BTCUSDT').selectionFor('taiwanStock')

    expect(selected).toBe('2330')
  })

  it('這個市場一檔都沒有時，一檔都不選', () => {
    // 留著一檔對不上的，畫面就會說謊：分頁寫著台股，圖上畫的是比特幣。
    const selected = new TradingSymbolOptionsDomain(
      listing(['BTCUSDT', 'crypto']), 'BTCUSDT').selectionFor('taiwanStock')

    expect(selected).toBe('')
  })

  it('不篩時，選著的那一檔照樣不動', () => {
    expect(new TradingSymbolOptionsDomain(LISTING, 'BTCUSDT').selectionFor(null)).toBe('BTCUSDT')
  })

  it('這個市場一檔都沒有時說得出來', () => {
    const optionsDomain = new TradingSymbolOptionsDomain(
      listing(['BTCUSDT', 'crypto']), 'BTCUSDT')

    expect(optionsDomain.hasNoneIn('taiwanStock')).toBe(true)
  })

  it('這個市場沒有東西時選單就是空的，不留下選著的那一檔充數', () => {
    const optionsDomain = new TradingSymbolOptionsDomain(
      listing(['BTCUSDT', 'crypto']), 'BTCUSDT')

    expect(namesOf(optionsDomain.optionsFor('taiwanStock'))).toEqual([])
    expect(optionsDomain.hasNoneIn('taiwanStock')).toBe(true)
  })

  it('這個市場有東西時不說沒有', () => {
    expect(new TradingSymbolOptionsDomain(LISTING, '2330').hasNoneIn('taiwanStock')).toBe(false)
  })

  it('整份清單都空時，不篩也是沒有', () => {
    expect(new TradingSymbolOptionsDomain([], 'BTCUSDT').hasNoneIn(null)).toBe(true)
  })
})
