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
})
