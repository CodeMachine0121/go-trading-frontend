import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotWatchedSymbol } from '~/domain/models/entities/strategy-bot-watched-symbol'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'

function aBotAllocating(percentages: [string, string][], capital: string | null) {
  return new StrategyBot(
    3, '早盤突破',
    percentages.map(([symbol, percentage]) =>
      new StrategyBotWatchedSymbol(symbol, '', false, null, null, new Decimal(percentage))),
    5, 9, '黃金交叉', 'stopped', null,
    capital === null
      ? null
      : new PositionPlanDto(new Decimal(capital), 'allIn', new Decimal(0), new Decimal(0), new Decimal(0)),
  ).toDomain().toDto()
}

describe('StrategyBotDomain 每個監聽標的的資金分配', () => {
  it('有部位規劃時說出分配與分到多少', () => {
    const watchedSymbols = aBotAllocating([['BTCUSDT', '60'], ['ETHUSDT', '40']], '1000').watchedSymbols

    expect(watchedSymbols.map(watchedSymbol => watchedSymbol.allocationLabel.in('zh-TW'))).toEqual(['分配 60%', '分配 40%'])
    expect(watchedSymbols.map(watchedSymbol => watchedSymbol.allocatedCapitalLabel?.in('zh-TW'))).toEqual(['分到 600', '分到 400'])
    expect(watchedSymbols[0]?.allocatedCapitalLabel?.in('en')).toBe('Gets 600')
  })

  it('沒有部位規劃時只說分配，不說分到多少', () => {
    const watchedSymbol = aBotAllocating([['BTCUSDT', '100']], null).watchedSymbols[0]

    expect(watchedSymbol?.allocationLabel.in('zh-TW')).toBe('分配 100%')
    expect(watchedSymbol?.allocatedCapitalLabel).toBeNull()
  })

  it('分配比例原樣交給表單填回去', () => {
    const watchedSymbol = aBotAllocating([['BTCUSDT', '33.33']], '1000').watchedSymbols[0]

    expect(watchedSymbol?.allocationPercentage.toString()).toBe('33.33')
    expect(watchedSymbol?.allocatedCapitalLabel?.in('zh-TW')).toBe('分到 333.3')
  })
})
