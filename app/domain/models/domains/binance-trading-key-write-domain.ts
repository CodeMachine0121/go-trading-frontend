import { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'

export class BinanceTradingKeyWriteDomain {
  private readonly apiKey: string
  private readonly secretKey: string

  constructor(writeDto: BinanceTradingKeyWriteDto) {
    this.apiKey = writeDto.apiKey.trim()
    this.secretKey = writeDto.secretKey.trim()
  }

  get rejection(): BinanceTradingKeyFieldError | null {
    if (this.apiKey === '') {
      return new BinanceTradingKeyFieldError('必須給 API Key', 'apiKey')
    }

    if (this.secretKey === '') {
      return new BinanceTradingKeyFieldError('必須給 Secret Key', 'secretKey')
    }

    return null
  }

  toWriteDto(): BinanceTradingKeyWriteDto {
    return new BinanceTradingKeyWriteDto(this.apiKey, this.secretKey)
  }
}
