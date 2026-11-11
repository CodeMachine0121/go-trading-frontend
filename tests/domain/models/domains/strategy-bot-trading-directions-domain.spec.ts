import { describe, expect, it } from 'vitest'
import { StrategyBotTradingDirectionsDomain } from '~/domain/models/domains/strategy-bot-trading-directions-domain'

describe('StrategyBotTradingDirectionsDomain 勾著的方向代表什麼', () => {
  it.each([
    { declared: ['long'], expected: '買入＝做多、賣出＝平多' },
    { declared: ['short'], expected: '賣出＝做空、買入＝平空' },
    { declared: ['long', 'short'], expected: '兩個都勾＝多空反手' },
  ])('勾 $declared 時說明含「$expected」', ({ declared, expected }) => {
    expect(new StrategyBotTradingDirectionsDomain(declared).description()?.in('zh-TW')).toContain(expected)
  })

  it.each([
    { declared: ['long', 'short'], label: '做多＋做空（多空反手）', shortLabel: '多空反手' },
    { declared: ['short'], label: '做空（只做空）', shortLabel: '只做空' },
    { declared: ['long'], label: '做多（只做多）', shortLabel: '只做多' },
  ])('$declared 在詳細區寫「$label」、清單上寫「$shortLabel」', ({ declared, label, shortLabel }) => {
    const domain = new StrategyBotTradingDirectionsDomain(declared)

    expect(domain.label()?.in('zh-TW')).toBe(label)
    expect(domain.shortLabel()?.in('zh-TW')).toBe(shortLabel)
  })

  it('一個都沒勾時擋下並說「至少要選一個交易方向」，也說不出意思', () => {
    const domain = new StrategyBotTradingDirectionsDomain([])

    expect(domain.rejection?.in('zh-TW')).toBe('至少要選一個交易方向')
    expect(domain.description()).toBeNull()
    expect(domain.label()).toBeNull()
    expect(domain.shortLabel()).toBeNull()
  })

  it('至少勾了一個就不擋', () => {
    expect(new StrategyBotTradingDirectionsDomain(['short']).rejection).toBeNull()
  })

  it('認不得的拼法拿掉、重複的合併、照做多在前的順序', () => {
    expect(new StrategyBotTradingDirectionsDomain(['short', 'sideways', 'long', 'short']).directions)
      .toEqual(['long', 'short'])
  })
})
