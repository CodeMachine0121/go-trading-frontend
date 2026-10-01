import type { IBinanceTradingKeyProxy } from '~/domain/interface/i-binance-trading-key-proxy'
import type { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'
import { BinanceTradingKeyVerificationError } from '~/domain/errors/binance-trading-key-verification-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import { TRADING_KEY_VERIFICATION_FAILURES } from '~/domain/models/vo/trading-key-verification-failure-vo'
import type { BinanceTradingKeyFieldVo } from '~/domain/models/vo/binance-trading-key-field-vo'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const BINANCE_TRADING_KEY_ENDPOINT = '/users/me/binance-trading-key'

const FIELD_RULE_STATUS = 400
const SECRET_SEAL_UNAVAILABLE_STATUS = 503

// 交易服務的欄位規則拒絕沒有帶欄位名，只能從那一句認出是哪一格。
const FIELD_NAMES_IN_MESSAGE: readonly [string, BinanceTradingKeyFieldVo][] = [
  ['Secret Key', 'secretKey'],
  ['API Key', 'apiKey'],
]

type BinanceTradingKeyWire = {
  configured: boolean
  apiKeyTail?: string
  tradableMarkets?: string[] | null
  configuredAt?: string
}

export class BinanceTradingKeyProxy extends BackendApiProxy implements IBinanceTradingKeyProxy {
  async fetchTradingKey(): Promise<BinanceTradingKey> {
    return this.toBinanceTradingKey(
      await this.requestBackend<BinanceTradingKeyWire>(BINANCE_TRADING_KEY_ENDPOINT))
  }

  async saveTradingKey(writeDto: BinanceTradingKeyWriteDto): Promise<BinanceTradingKey> {
    try {
      return this.toBinanceTradingKey(
        await this.requestBackend<BinanceTradingKeyWire>(BINANCE_TRADING_KEY_ENDPOINT, {
          method: 'PUT',
          body: { apiKey: writeDto.apiKey, secretKey: writeDto.secretKey },
        }))
    }
    catch (error: unknown) {
      if (!(error instanceof BackendRequestRejectedError || error instanceof BackendServerError)) {
        throw error
      }

      const verificationFailure = TRADING_KEY_VERIFICATION_FAILURES
        .find(failure => failure === error.reason)
      if (verificationFailure !== undefined) {
        throw new BinanceTradingKeyVerificationError(
          error.message, verificationFailure, { cause: error })
      }

      if (error instanceof BackendServerError && error.status === SECRET_SEAL_UNAVAILABLE_STATUS) {
        throw new SecretSealUnavailableError(error.message, { cause: error })
      }

      if (error instanceof BackendRequestRejectedError && error.status === FIELD_RULE_STATUS) {
        const field = FIELD_NAMES_IN_MESSAGE
          .find(([fieldName]) => error.message.includes(fieldName))?.[1] ?? null

        throw new BinanceTradingKeyFieldError(
          new UntranslatedTextVo(error.message), field, { cause: error })
      }

      throw error
    }
  }

  async removeTradingKey(): Promise<void> {
    await this.requestBackend<null>(BINANCE_TRADING_KEY_ENDPOINT, { method: 'DELETE' })
  }

  private toBinanceTradingKey(wire: BinanceTradingKeyWire): BinanceTradingKey {
    return new BinanceTradingKey(
      wire.configured,
      wire.apiKeyTail ?? '',
      wire.tradableMarkets ?? [],
      wire.configured && wire.configuredAt !== undefined ? new Date(wire.configuredAt) : null,
    )
  }
}
