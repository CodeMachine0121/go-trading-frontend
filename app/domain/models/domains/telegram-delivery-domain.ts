import type { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'
import { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'

/**
 * Domain Model：一份 Telegram 投遞設定在畫面上是什麼樣子。
 *
 * 它唯一的行為是把「目前存著的是哪一組金鑰」講成一句話。那句話得在這裡講，
 * 不能在元件裡拼——它是使用者唯一能用來認出「是不是我貼的那一組」的線索。
 *
 * 它**刻意不重複畫面上已經有的東西**：聊天室代號就在下面那一格輸入框裡，
 * 說第二次只是把同一個數字擺兩份，而兩份遲早會有人以為它們是兩件事。
 * 「要更換請重新填入整串」也不在這裡——那是那一格輸入框的說明，寫在它旁邊才有用。
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
      return '金鑰已設定'
    }

    return `金鑰結尾 ${this.telegramDelivery.botTokenTail}`
  }
}
