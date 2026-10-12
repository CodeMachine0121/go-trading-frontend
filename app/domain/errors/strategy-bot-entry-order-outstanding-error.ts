import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 哨兵錯誤：這台機器人還有一張進場單掛在幣安上，交易服務不讓它被刪掉。 */
export class StrategyBotEntryOrderOutstandingError extends LocalizedError {
  constructor(options?: { cause?: unknown }) {
    super(new LocalizedTextVo(
      '這台機器人還有一張進場單掛在幣安上，請先關掉自動下單，等它撤單後再刪除',
      'This bot still has an entry order resting on Binance. Turn auto order off and wait for the order to be cancelled before deleting the bot.',
    ), { cause: options?.cause })
    this.name = 'StrategyBotEntryOrderOutstandingError'
  }
}
