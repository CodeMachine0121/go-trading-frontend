import { describe, expect, it } from 'vitest'
import { StrategyBotWatchedSymbolListDomain } from '~/domain/models/domains/strategy-bot-watched-symbol-list-domain'

const TEN_SYMBOLS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10']

describe('StrategyBotWatchedSymbolListDomain', () => {
  it.each([
    { name: '一個標的', symbols: ['BTCUSDT'], expected: undefined },
    { name: '正好 10 個', symbols: TEN_SYMBOLS, expected: undefined },
    { name: '一個都沒有', symbols: [], expected: '必須指定這台機器人要盯哪些交易標的' },
    { name: '超過 10 個', symbols: [...TEN_SYMBOLS, 'A11'], expected: '一台機器人最多盯 10 個交易標的' },
    { name: '大小寫不同的同一個', symbols: ['BTCUSDT', 'btcusdt'], expected: '交易標的 BTCUSDT 重複了' },
  ])('$name', ({ symbols, expected }) => {
    expect(new StrategyBotWatchedSymbolListDomain(symbols).rejection?.in('zh-TW')).toBe(expected)
  })

  it('拒絕原因也說得出英文', () => {
    expect(new StrategyBotWatchedSymbolListDomain([]).rejection?.in('en'))
      .toBe('Choose which trading symbols the bot watches')
  })

  it.each([
    { name: '加入第二個', symbols: ['BTCUSDT'], adding: 'ETHUSDT', expected: ['BTCUSDT', 'ETHUSDT'] },
    { name: '加入時去空白轉大寫', symbols: [], adding: ' ethusdt ', expected: ['ETHUSDT'] },
    { name: '同一個不重複加入', symbols: ['BTCUSDT'], adding: 'btcusdt', expected: ['BTCUSDT'] },
    { name: '空白不加入', symbols: ['BTCUSDT'], adding: '  ', expected: ['BTCUSDT'] },
    { name: '已滿 10 個不再加', symbols: TEN_SYMBOLS, adding: 'A11', expected: TEN_SYMBOLS },
  ])('$name', ({ symbols, adding, expected }) => {
    expect(new StrategyBotWatchedSymbolListDomain(symbols).adding(adding)).toEqual(expected)
  })

  it('拿掉一個標的', () => {
    expect(new StrategyBotWatchedSymbolListDomain(['BTCUSDT', 'ETHUSDT']).removing('ETHUSDT')).toEqual(['BTCUSDT'])
  })

  it.each([
    { symbols: ['BTCUSDT'], isFull: false },
    { symbols: TEN_SYMBOLS.slice(0, 9), isFull: false },
    { symbols: TEN_SYMBOLS, isFull: true },
  ])('$symbols.length 個時滿了嗎：$isFull', ({ symbols, isFull }) => {
    expect(new StrategyBotWatchedSymbolListDomain(symbols).isFull).toBe(isFull)
  })

  it('正規化去前後空白並轉大寫，順序不變', () => {
    expect(new StrategyBotWatchedSymbolListDomain([' ethusdt', 'BTCUSDT ']).normalized).toEqual(['ETHUSDT', 'BTCUSDT'])
  })
})
