import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'
import type { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { TradeFeeRatesWriteDto } from '~/domain/models/dto/trade-fee-rates-write-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const NOT_CONFIGURED_SUMMARY = new LocalizedTextVo('還沒設定', 'Not set yet')
const NEGATIVE_RATE_MESSAGE = new LocalizedTextVo('手續費率不得為負', 'Fee rate cannot be negative')
const UNREADABLE_RATE_MESSAGE = new LocalizedTextVo('手續費率要填數字', 'Fee rate must be a number')

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
        ? new LocalizedTextVo(
            `掛單 ${makerFeeRate.toFixed()}%・吃單 ${takerFeeRate.toFixed()}%`,
            `Maker ${makerFeeRate.toFixed()}% · Taker ${takerFeeRate.toFixed()}%`)
        : NOT_CONFIGURED_SUMMARY,
    )
  }

  rateInputHint(rateText: string): LocalizedTextVo | null {
    const trimmed = rateText.trim()
    if (trimmed === '') {
      return null
    }

    const rate = new DecimalInputDomain(trimmed).value
    if (rate === null) {
      return UNREADABLE_RATE_MESSAGE
    }

    return rate.isNegative() ? NEGATIVE_RATE_MESSAGE : null
  }

  toFeeRatesWriteDto(makerRateText: string, takerRateText: string): TradeFeeRatesWriteDto {
    return new TradeFeeRatesWriteDto(new DecimalInputDomain(makerRateText).value, new DecimalInputDomain(takerRateText).value)
  }
}
