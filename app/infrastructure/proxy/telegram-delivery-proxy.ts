import type { ITelegramDeliveryProxy } from '~/domain/interface/i-telegram-delivery-proxy'
import type { TelegramDeliveryWriteDto } from '~/domain/models/dto/telegram-delivery-write-dto'
import { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const TELEGRAM_DELIVERY_ENDPOINT = '/users/me/telegram-delivery'
const TEST_MESSAGE_ENDPOINT = '/users/me/telegram-delivery/test-message'

/** 後端用這兩個狀態碼分別表示這兩件事。只有這裡需要知道。 */
const NOT_CONFIGURED_STATUS = 409
const SECRET_SEAL_UNAVAILABLE_STATUS = 503

/** 後端回傳的原始 wire 形狀，只存在於本檔內。 */
type TelegramDeliveryWire = {
  configured: boolean
  chatId: string
  botTokenTail: string
}

type TestMessageResultWire = {
  delivered: boolean
  failureReason?: string
}

/**
 * Proxy：打 Telegram 投遞那四條路，並把兩種「其實是業務答案」的拒絕從一般的拒絕裡分出來。
 *
 * 兩者非分開不可，因為使用者要做的事完全不同：後端存不了金鑰是**什麼都不必改**，
 * 還沒設定過則是**去上面那張卡設定一次**。混在一起，前者會讓他把整串金鑰重貼三次。
 */
export class TelegramDeliveryProxy extends BackendApiProxy implements ITelegramDeliveryProxy {
  async fetchDeliverySetting(): Promise<TelegramDelivery> {
    return this.toTelegramDelivery(
      await this.requestBackend<TelegramDeliveryWire>(TELEGRAM_DELIVERY_ENDPOINT))
  }

  async saveDeliverySetting(writeDto: TelegramDeliveryWriteDto): Promise<TelegramDelivery> {
    try {
      return this.toTelegramDelivery(
        await this.requestBackend<TelegramDeliveryWire>(TELEGRAM_DELIVERY_ENDPOINT, {
          // PUT 而不是 POST：一個人最多一份，送兩次留下的仍然是同一份。
          method: 'PUT',
          body: { botToken: writeDto.botToken, chatId: writeDto.chatId },
        }))
    }
    catch (error: unknown) {
      throw this.sealFailureOf(error)
    }
  }

  async removeDeliverySetting(): Promise<void> {
    await this.requestBackend<null>(TELEGRAM_DELIVERY_ENDPOINT, { method: 'DELETE' })
  }

  /**
   * 送一則訊息，並回報四種原因之一，或 null 代表送到了。
   *
   * 後端對「送不出去」回的是 200 加一個原因，不是一個錯誤——那一次請求做的就是
   * 「試著送、然後回報」，而它做到了。這裡照著讀，不把它翻成拋出來的東西：
   * 翻了的話，呼叫端得從一堆錯誤裡把四種預期中的結果再挑出來。
   */
  async sendTestMessage(message: string): Promise<string | null> {
    try {
      const result = await this.requestBackend<TestMessageResultWire>(TEST_MESSAGE_ENDPOINT, {
        method: 'POST',
        body: { message },
      })

      return result.delivered ? null : (result.failureReason ?? 'unreachable')
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError
        && error.status === NOT_CONFIGURED_STATUS) {
        throw new TelegramNotConfiguredError(error.message, { cause: error })
      }

      throw this.sealFailureOf(error)
    }
  }

  /**
   * 後端沒有東西可以鎖住金鑰，是伺服器端的狀況，所以它到得了這裡時是
   * BackendServerError 而不是一般的拒絕——這一段因此要認的是那一種。
   */
  private sealFailureOf(error: unknown): unknown {
    if (error instanceof BackendServerError
      && error.status === SECRET_SEAL_UNAVAILABLE_STATUS) {
      return new SecretSealUnavailableError(error.message, { cause: error })
    }

    return error
  }

  private toTelegramDelivery(wire: TelegramDeliveryWire): TelegramDelivery {
    return new TelegramDelivery(wire.configured, wire.chatId, wire.botTokenTail)
  }
}
