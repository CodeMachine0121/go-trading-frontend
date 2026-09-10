import type { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'
import { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'

/**
 * Domain Model：一份 Telegram 投遞設定在畫面上是什麼樣子。
 *
 * 它唯一的行為是把「已設定，結尾 1234」這句話講出來，而那句話得在這裡講，
 * 不能在元件裡拼：它同時要說明**那一格為什麼是空的**——金鑰存進去就再也拿不回來，
 * 要換就得重填整串。少了後半句，使用者會以為畫面把他的金鑰弄丟了。
 */
export class TelegramDeliveryDomain {
  constructor(private readonly telegramDelivery: TelegramDelivery) {}

  toDto(): TelegramDeliveryDto {
    return new TelegramDeliveryDto(
      this.telegramDelivery.configured,
      this.telegramDelivery.chatId,
      this.telegramDelivery.botTokenTail,
      this.summary(),
    )
  }

  private summary(): string | null {
    if (!this.telegramDelivery.configured) {
      return null
    }

    // 後端對短到遮不住的金鑰回一個空的結尾，而不是回整串。這裡跟著少說那半句，
    // 不自己補一個看起來像結尾的東西。
    if (this.telegramDelivery.botTokenTail === '') {
      return '已設定；要更換請重新填入整串金鑰。'
    }

    return `已設定，結尾 ${this.telegramDelivery.botTokenTail}；要更換請重新填入整串金鑰。`
  }
}
