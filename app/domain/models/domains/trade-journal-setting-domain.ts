import Decimal from 'decimal.js'
import type { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { TradeFeeRatesWriteDto } from '~/domain/models/dto/trade-fee-rates-write-dto'

const NOT_CONFIGURED_SUMMARY = '還沒設定'
const NEGATIVE_RATE_MESSAGE = '手續費率不得為負'
const UNREADABLE_RATE_MESSAGE = '手續費率要填數字'

export class TradeJournalSettingDomain {
  constructor(private readonly setting: TradeJournalSetting) {}

  toDto(): TradeJournalSettingDto {
    const makerFeeRate = this.setting.makerFeeRate
    const takerFeeRate = this.setting.takerFeeRate
    const configured = makerFeeRate !== null && takerFeeRate !== null

    return new TradeJournalSettingDto(
      makerFeeRate,
      takerFeeRate,
      configured,
      configured
        ? `掛單 ${makerFeeRate.toFixed()}%・吃單 ${takerFeeRate.toFixed()}%`
        : NOT_CONFIGURED_SUMMARY,
    )
  }

  rateInputHint(rateText: string): string | null {
    const trimmed = rateText.trim()
    if (trimmed === '') {
      return null
    }

    const rate = this.rateOf(trimmed)
    if (rate === null) {
      return UNREADABLE_RATE_MESSAGE
    }

    return rate.isNegative() ? NEGATIVE_RATE_MESSAGE : null
  }

  toFeeRatesWriteDto(makerRateText: string, takerRateText: string): TradeFeeRatesWriteDto {
    return new TradeFeeRatesWriteDto(this.rateOf(makerRateText.trim()), this.rateOf(takerRateText.trim()))
  }

  private rateOf(trimmedText: string): Decimal | null {
    if (trimmedText === '') {
      return null
    }

    try {
      return new Decimal(trimmedText)
    }
    catch {
      return null
    }
  }
}
