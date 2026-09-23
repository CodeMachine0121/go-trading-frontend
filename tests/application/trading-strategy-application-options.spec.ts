import { describe, expect, it } from 'vitest'
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
