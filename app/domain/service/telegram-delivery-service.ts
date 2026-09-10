import type { ITelegramDeliveryProxy } from '~/domain/interface/i-telegram-delivery-proxy'
import type { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'
import { TelegramDeliveryWriteDto } from '~/domain/models/dto/telegram-delivery-write-dto'
import { TestMessageResultDto } from '~/domain/models/dto/test-message-result-dto'
import { TelegramDeliveryDomain } from '~/domain/models/domains/telegram-delivery-domain'
import { TestMessageDomain } from '~/domain/models/domains/test-message-domain'
import { DeliveryFailureDomain } from '~/domain/models/domains/delivery-failure-domain'

/**
 * Domain Service：「這台系統要怎麼找到我」這件事的唯一入口。
 * 四個公開用例互不呼叫。
 */
export class TelegramDeliveryService {
  constructor(private readonly telegramDeliveryProxy: ITelegramDeliveryProxy) {}

  /** 讀回目前的設定。還沒設定過會是一份說自己還沒設定的形狀，不是錯誤。 */
  async loadDeliverySetting(): Promise<TelegramDeliveryDto> {
    const telegramDelivery = await this.telegramDeliveryProxy.fetchDeliverySetting()

    return new TelegramDeliveryDomain(telegramDelivery).toDto()
  }

  /**
   * 存下一份設定，並回它存好之後的樣子。
   *
   * 兩格去前後空白——貼過來的東西常常拖著換行，而沒有人打算把換行也設定進去。
   * 這與密碼一個字都不動是刻意的不一致：密碼的空白是使用者選的字元。
   */
  async saveDeliverySetting(botToken: string, chatId: string): Promise<TelegramDeliveryDto> {
    const telegramDelivery = await this.telegramDeliveryProxy.saveDeliverySetting(
      new TelegramDeliveryWriteDto(botToken.trim(), chatId.trim()))

    return new TelegramDeliveryDomain(telegramDelivery).toDto()
  }

  /** 整份移除。 */
  async removeDeliverySetting(): Promise<void> {
    await this.telegramDeliveryProxy.removeDeliverySetting()
  }

  /**
   * 試送一則訊息，並回一個**已經翻成句子**的結果。
   *
   * 翻譯在這裡做，不留給元件：四種原因四句不同的話，那四句是規則的一部分。
   * 散在元件裡寫成四個分支，遲早有一種被漏掉、變成一句籠統的「送出失敗」——
   * 而這顆鍵的全部價值就在於它會說出是哪一格填錯。
   */
  async sendTestMessage(message: string): Promise<TestMessageResultDto> {
    const testMessage = new TestMessageDomain(message)
    const messageError = testMessage.error()
    if (messageError !== null) {
      return new TestMessageResultDto(false, messageError)
    }

    const failureReason = await this.telegramDeliveryProxy.sendTestMessage(testMessage.value())
    if (failureReason === null) {
      return new TestMessageResultDto(true, null)
    }

    return new TestMessageResultDto(false, new DeliveryFailureDomain(failureReason).sentence())
  }
}
