import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyBotNotificationsDto } from '~/domain/models/dto/strategy-bot-notifications-dto'

/** 三種通知各叫什麼，依畫面上的順序。 */
const NOTIFICATION_NAMES = {
  buy: new LocalizedTextVo('買入', 'Buy'),
  sell: new LocalizedTextVo('賣出', 'Sell'),
  hold: new LocalizedTextVo('持有', 'Hold'),
} as const

/**
 * Domain Model：一台機器人的通知開關怎麼說給人聽。
 *
 * 一句話列出開著的那幾種（「買入、賣出」），一種都沒開時說「全部關閉」——
 * 一格空白看起來像還沒讀到，而不是「這台什麼都不會寄」。
 */
export class StrategyBotNotificationsDomain {
  constructor(private readonly notifications: StrategyBotNotificationsDto) {}

  label(): LocalizedTextVo {
    const enabledNames = (['buy', 'sell', 'hold'] as const)
      .filter(verdict => this.notifications[verdict])
      .map(verdict => NOTIFICATION_NAMES[verdict])

    if (enabledNames.length === 0) {
      return new LocalizedTextVo('全部關閉', 'All off')
    }

    return new LocalizedTextVo(
      enabledNames.map(name => name.traditionalChinese).join('、'),
      enabledNames.map(name => name.english).join(', '))
  }
}
