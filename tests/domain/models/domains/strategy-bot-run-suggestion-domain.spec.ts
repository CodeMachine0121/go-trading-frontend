import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { StrategyBotRunSuggestionDomain } from '~/domain/models/domains/strategy-bot-run-suggestion-domain'
import { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'

// 一輪建議過的部位寫成一句話——直接從它自己的入口問。
describe('StrategyBotRunSuggestionDomain', () => {
  it('合約那一輪說出方向、倍數、保證金與名目', () => {
    const suggestion = new StrategyBotRunSuggestionDomain(new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'buy',
      new Decimal(1000), new Decimal(98), null, 'long', new Decimal(5), new Decimal(5000)))

    expect(suggestion.toText()).toBe('做多 5 倍 · 保證金 1000 · 名目 5000 · 停損 98')
  })

  it('現貨那一輪只說押多少', () => {
    const suggestion = new StrategyBotRunSuggestionDomain(new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'buy', new Decimal(5000), null, new Decimal(70000)))

    expect(suggestion.toText()).toBe('押 5000 · 停利 70000')
  })

  it('沒有開倉金額就沒有一句話', () => {
    const suggestion = new StrategyBotRunSuggestionDomain(new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'hold', null, null, null))

    expect(suggestion.toText()).toBeNull()
  })

  it('金額照記下的數字原樣寫出，一位小數都不少', () => {
    const suggestion = new StrategyBotRunSuggestionDomain(new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'sell',
      new Decimal('1000.000000000000000001'), null, null,
      'short', new Decimal('5'), new Decimal('5000.123456789012345678')))

    expect(suggestion.toText())
      .toBe('做空 5 倍 · 保證金 1000.000000000000000001 · 名目 5000.123456789012345678')
  })

  it.each(['sideways', 'constructor', 'toString'])('認不得的方向 %s 不寫，也不把沿著原型找到的東西當方向', (direction) => {
    const suggestion = new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'buy',
      new Decimal(1000), null, null, direction, new Decimal(5), new Decimal(5000)).toSuggestionDomain()

    expect(suggestion.toText()).toBe('5 倍 · 保證金 1000 · 名目 5000')
  })
})
