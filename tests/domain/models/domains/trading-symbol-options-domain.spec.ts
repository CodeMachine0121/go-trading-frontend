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

  it('被篩掉的那一檔如果正選著，仍然留在選單上', () => {
    // 少了這一條，切換市場會把使用者正在看的那一檔從選單上抹掉，
    // 而畫面就得替他改選一個他沒要的標的——他只是想換個角度看清單。
    const options = new TradingSymbolOptionsDomain(LISTING, 'BTCUSDT').optionsFor('taiwanStock')

    expect(namesOf(options)).toEqual(['2330', '2454', 'BTCUSDT'])
  })

  it('這個市場一檔都沒有時說得出來', () => {
    const optionsDomain = new TradingSymbolOptionsDomain(
      listing(['BTCUSDT', 'crypto']), 'BTCUSDT')

    expect(optionsDomain.hasNoneIn('taiwanStock')).toBe(true)
  })

  it('只因為被選著才留下來的那一檔，不算這個市場有東西', () => {
    // 選單上還有一個項目，但那是使用者原本就選著的，不是這個市場提供的選擇。
    const optionsDomain = new TradingSymbolOptionsDomain(
      listing(['BTCUSDT', 'crypto']), 'BTCUSDT')

    expect(namesOf(optionsDomain.optionsFor('taiwanStock'))).toEqual(['BTCUSDT'])
    expect(optionsDomain.hasNoneIn('taiwanStock')).toBe(true)
  })

  it('這個市場有東西時不說沒有', () => {
    expect(new TradingSymbolOptionsDomain(LISTING, '2330').hasNoneIn('taiwanStock')).toBe(false)
  })

  it('整份清單都空時，不篩也是沒有', () => {
    expect(new TradingSymbolOptionsDomain([], 'BTCUSDT').hasNoneIn(null)).toBe(true)
  })
})
