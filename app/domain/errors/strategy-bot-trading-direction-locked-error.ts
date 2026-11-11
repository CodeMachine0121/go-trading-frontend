import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 哨兵錯誤：這台機器人的自動下單開著，交易服務不讓它改交易方向。
 *
 * 下一步不在表單上，而在詳細頁的自動下單開關：一台正在用真錢交易的機器人，
 * 方向只能在先關掉自動下單之後才改。
 */
export class StrategyBotTradingDirectionLockedError extends LocalizedError {
  constructor(options?: { cause?: unknown }) {
    super(new LocalizedTextVo(
      '自動下單開著時不能改交易方向：請先在這台機器人的詳細頁關掉自動下單，再改交易方向',
      'Auto order is on, so the trading direction cannot change: turn auto order off on this bot\'s detail page first, then change the trading direction.',
    ), { cause: options?.cause })
    this.name = 'StrategyBotTradingDirectionLockedError'
  }
}
