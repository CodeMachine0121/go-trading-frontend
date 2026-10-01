import { describe, expect, it } from 'vitest'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'

describe('TradeLinkedStrategyDomain', () => {
  it.each([
    ['沒有關聯', null, null, false, '自行判斷', 'Self-judged'],
    ['已刪除', 5, 'BTC 趨勢跟隨', true, '關聯的交易策略已刪除', 'Linked trading strategy deleted'],
    // 交易策略的名字是使用者取的，英文畫面上也原樣呈現。
    ['有名字', 5, 'BTC 趨勢跟隨', false, 'BTC 趨勢跟隨', 'BTC 趨勢跟隨'],
    ['後端沒給名字', 5, null, false, '', ''],
  ])('%s', (_, tradingStrategyId, tradingStrategyName, tradingStrategyDeleted, expected, expectedEnglish) => {
    const label = new TradeLinkedStrategyDomain(tradingStrategyId, tradingStrategyName, tradingStrategyDeleted).label

    expect(label.in('zh-TW')).toBe(expected)
    expect(label.in('en')).toBe(expectedEnglish)
  })
})
