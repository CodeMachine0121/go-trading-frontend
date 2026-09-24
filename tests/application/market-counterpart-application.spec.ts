import { describe, expect, it, vi } from 'vitest'
import { MarketCounterpartApplication } from '~/application/market-counterpart-application'
import { MarketSideService } from '~/domain/service/market-side-service'
import type { IMarketSidePreferenceProxy } from '~/domain/interface/i-market-side-preference-proxy'

function marketCounterpartApplicationRemembering(rememberedSide: string | null) {
  const marketSidePreferenceProxy: IMarketSidePreferenceProxy = {
    readMarketSide: vi.fn(() => rememberedSide),
    writeMarketSide: vi.fn(),
  }

  return {
    marketSidePreferenceProxy,
    marketCounterpartApplication: new MarketCounterpartApplication(new MarketSideService(marketSidePreferenceProxy)),
  }
}

const { marketCounterpartApplication } = marketCounterpartApplicationRemembering(null)

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

describe('MarketCounterpartApplication 記住使用者最後站在哪一邊', () => {
  it.each([
    { name: '從沒切過就是現貨', remembered: null, side: 'spot' },
    { name: '記住的是合約就是合約', remembered: 'contract', side: 'contract' },
    { name: '記住的是看不懂的值就是現貨', remembered: 'futures', side: 'spot' },
  ])('$name', ({ remembered, side }) => {
    const { marketCounterpartApplication: application } = marketCounterpartApplicationRemembering(remembered)

    expect(application.restoreMarketSide()).toBe(side)
  })

  it.each([
    { name: '記下合約', side: 'contract', remembered: 'contract' },
    { name: '看不懂的值記成現貨', side: 'futures', remembered: 'spot' },
  ])('$name', ({ side, remembered }) => {
    const { marketCounterpartApplication: application, marketSidePreferenceProxy } = marketCounterpartApplicationRemembering(null)

    expect(application.rememberMarketSide(side)).toBe(remembered)
    expect(marketSidePreferenceProxy.writeMarketSide).toHaveBeenCalledWith(remembered)
  })
})

describe('MarketCounterpartApplication 導覽上的一格在某一邊要去哪裡', () => {
  it.each([
    { name: '行情圖表在合約那一邊去合約 K 線圖表', path: '/k-candles/chart', side: 'contract' as const, expected: '/contract-k-candles/chart' },
    { name: '行情圖表在現貨那一邊就是它自己', path: '/k-candles/chart', side: 'spot' as const, expected: '/k-candles/chart' },
    { name: 'K 線資料在合約那一邊去合約 K 線瀏覽', path: '/k-candles', side: 'contract' as const, expected: '/contract-k-candles' },
    { name: '策略腳本在合約那一邊去合約策略腳本', path: '/strategy-scripts', side: 'contract' as const, expected: '/contract-strategy-scripts' },
    { name: '機器人在合約那一邊去合約策略機器人', path: '/strategy-bots', side: 'contract' as const, expected: '/contract-strategy-bots' },
    { name: '不分兩邊的交易策略哪一邊都是它自己', path: '/trading-strategies', side: 'contract' as const, expected: '/trading-strategies' },
    { name: '合約那一頁在現貨那一邊回到現貨', path: '/contract-k-candles', side: 'spot' as const, expected: '/k-candles' },
  ])('$name', ({ path, side, expected }) => {
    expect(marketCounterpartApplication.resolvePathOnSide(path, side)).toBe(expected)
  })
})
