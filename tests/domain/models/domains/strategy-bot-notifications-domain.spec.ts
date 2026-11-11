import { describe, expect, it } from 'vitest'
import { StrategyBotNotificationsDomain } from '~/domain/models/domains/strategy-bot-notifications-domain'
import { StrategyBotNotificationsDto } from '~/domain/models/dto/strategy-bot-notifications-dto'

describe('StrategyBotNotificationsDomain 怎麼說一台機器人的通知', () => {
  it.each([
    { buy: true, sell: true, hold: false, zh: '買入、賣出', en: 'Buy, Sell' },
    { buy: true, sell: true, hold: true, zh: '買入、賣出、持有', en: 'Buy, Sell, Hold' },
    { buy: false, sell: true, hold: false, zh: '賣出', en: 'Sell' },
    { buy: false, sell: false, hold: false, zh: '全部關閉', en: 'All off' },
  ])('買入 $buy、賣出 $sell、持有 $hold 寫「$zh」', ({ buy, sell, hold, zh, en }) => {
    const label = new StrategyBotNotificationsDomain(new StrategyBotNotificationsDto(buy, sell, hold)).label()

    expect(label.in('zh-TW')).toBe(zh)
    expect(label.in('en')).toBe(en)
  })

  it('沒說的機器人是買入開、賣出開、持有關', () => {
    expect(new StrategyBotNotificationsDto()).toEqual(new StrategyBotNotificationsDto(true, true, false))
  })
})
