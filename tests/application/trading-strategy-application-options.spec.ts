import { describe, expect, it, vi } from 'vitest'
import { TradingStrategy } from '~/domain/models/entities/trading-strategy'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'

const application = new TradingStrategyApplication(new TradingStrategyService({} as ITradingStrategyProxy))

describe('TradingStrategyApplication 的兩份選單', () => {
  it('行情種類：K 線在前（新拼一份的預設），合約行情在後', () => {
    expect(application.listMarketDataKindOptions().map(option => [option.value, option.label]))
      .toEqual([['kCandle', 'K 線'], ['contractKCandle', '合約行情']])
  })

  it('交易模式：多空反手在前（合約交易策略的預設）', () => {
    expect(application.listContractTradingModeOptions().map(option => option.value))
      .toEqual(['longShort', 'longOnly', 'shortOnly'])
  })
})

describe('TradingStrategyApplication 這一種機器人跟得了的交易策略', () => {
  const listTradingStrategies = vi.fn().mockResolvedValue([
    new TradingStrategy(9, '黃金交叉', [], null, null),
    new TradingStrategy(11, '費率反轉', [], null, null, 'contractKCandle', 'longShort'),
  ])
  const followable = new TradingStrategyApplication(new TradingStrategyService(
    { listTradingStrategies } as unknown as ITradingStrategyProxy))

  it.each([
    { marketDataKind: 'kCandle' as const, expected: ['黃金交叉'] },
    { marketDataKind: 'contractKCandle' as const, expected: ['費率反轉'] },
  ])('$marketDataKind 機器人只跟得了同一種的', async ({ marketDataKind, expected }) => {
    const tradingStrategies = await followable.listTradingStrategiesFollowableBy(marketDataKind)

    expect(tradingStrategies.map(tradingStrategy => tradingStrategy.name)).toEqual(expected)
  })
})
