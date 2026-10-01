import { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class BinanceTradingKeyWriteDomain {
  private readonly apiKey: string
  private readonly secretKey: string

  constructor(writeDto: BinanceTradingKeyWriteDto) {
    this.apiKey = writeDto.apiKey.trim()
    this.secretKey = writeDto.secretKey.trim()
  }

  get rejection(): BinanceTradingKeyFieldError | null {
    if (this.apiKey === '') {
      return new BinanceTradingKeyFieldError(
        new LocalizedTextVo('必須給 API Key', 'API Key is required'), 'apiKey')
    }

    if (this.secretKey === '') {
      return new BinanceTradingKeyFieldError(
        new LocalizedTextVo('必須給 Secret Key', 'Secret Key is required'), 'secretKey')
    }

    return null
  }

  toWriteDto(): BinanceTradingKeyWriteDto {
    return new BinanceTradingKeyWriteDto(this.apiKey, this.secretKey)
  }
}
