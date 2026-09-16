import type { TelegramDeliveryService } from '~/domain/service/telegram-delivery-service'
import type { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'
import type { TestMessageResultDto } from '~/domain/models/dto/test-message-result-dto'

/** Application：「這台系統要怎麼找到我」那四個用例的編排。 */
export class TelegramDeliveryApplication {
  constructor(private readonly telegramDeliveryService: TelegramDeliveryService) {}

  async loadDeliverySetting(): Promise<TelegramDeliveryDto> {
    return this.telegramDeliveryService.loadDeliverySetting()
  }

  async saveDeliverySetting(botToken: string, chatId: string): Promise<TelegramDeliveryDto> {
    return this.telegramDeliveryService.saveDeliverySetting(botToken, chatId)
  }

  async removeDeliverySetting(): Promise<void> {
    await this.telegramDeliveryService.removeDeliverySetting()
  }

  async sendTestMessage(message: string): Promise<TestMessageResultDto> {
    return this.telegramDeliveryService.sendTestMessage(message)
  }
}
