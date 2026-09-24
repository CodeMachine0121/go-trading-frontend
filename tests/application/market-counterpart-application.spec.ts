import { describe, expect, it } from 'vitest'
import { MarketCounterpartApplication } from '~/application/market-counterpart-application'

const marketCounterpartApplication = new MarketCounterpartApplication()

describe('MarketCounterpartApplication 有兩邊的畫面', () => {
  it.each([
    { name: '現貨 K 線圖表 → 合約 K 線圖表', path: '/k-candles/chart', side: 'spot', counterpart: '/contract-k-candles/chart' },
    { name: '合約 K 線圖表 → 現貨 K 線圖表', path: '/contract-k-candles/chart', side: 'contract', counterpart: '/k-candles/chart' },
    { name: '現貨 K 線瀏覽 → 合約 K 線瀏覽', path: '/k-candles', side: 'spot', counterpart: '/contract-k-candles' },
    { name: '合約 K 線瀏覽 → 現貨 K 線瀏覽', path: '/contract-k-candles', side: 'contract', counterpart: '/k-candles' },
    { name: '現貨策略腳本 → 合約策略腳本', path: '/strategy-scripts', side: 'spot', counterpart: '/contract-strategy-scripts' },
    { name: '合約策略腳本 → 現貨策略腳本', path: '/contract-strategy-scripts', side: 'contract', counterpart: '/strategy-scripts' },
    { name: '合約策略機器人清單 → 現貨策略機器人清單', path: '/contract-strategy-bots', side: 'contract', counterpart: '/strategy-bots' },
    { name: '現貨策略機器人清單 → 合約策略機器人清單', path: '/strategy-bots', side: 'spot', counterpart: '/contract-strategy-bots' },
    { name: '結尾多一條斜線也認得', path: '/k-candles/', side: 'spot', counterpart: '/contract-k-candles' },
  ])('$name', ({ path, side, counterpart }) => {
    const counterpartDto = marketCounterpartApplication.describeCounterpart(path)

    expect(counterpartDto.side).toBe(side)
    expect(counterpartDto.counterpartPath).toBe(counterpart)
    expect(counterpartDto.switchable).toBe(true)
  })
})

describe('MarketCounterpartApplication 建立或編輯機器人時對應到另一邊的清單', () => {
  it.each([
    { name: '編輯一台現貨機器人', path: '/strategy-bots/12', side: 'spot', counterpart: '/contract-strategy-bots' },
    { name: '建立一台現貨機器人', path: '/strategy-bots/new', side: 'spot', counterpart: '/contract-strategy-bots' },
    { name: '編輯一台合約機器人', path: '/contract-strategy-bots/7', side: 'contract', counterpart: '/strategy-bots' },
  ])('$name', ({ path, side, counterpart }) => {
    const counterpartDto = marketCounterpartApplication.describeCounterpart(path)

    expect(counterpartDto.side).toBe(side)
    expect(counterpartDto.counterpartPath).toBe(counterpart)
  })
})

describe('MarketCounterpartApplication 不分現貨合約的畫面', () => {
  it.each([
    { name: '交易策略清單', path: '/trading-strategies' },
    { name: '一份交易策略', path: '/trading-strategies/3' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: '設定', path: '/settings' },
    { name: 'AI-Assistant', path: '/chat' },
    { name: '根路徑', path: '/' },
  ])('$name', ({ path }) => {
    const counterpartDto = marketCounterpartApplication.describeCounterpart(path)

    expect(counterpartDto.side).toBeNull()
    expect(counterpartDto.counterpartPath).toBeNull()
    expect(counterpartDto.switchable).toBe(false)
  })
})
