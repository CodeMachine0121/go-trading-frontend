import Decimal from 'decimal.js'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import type { TradeFeeRatesWriteDto } from '~/domain/models/dto/trade-fee-rates-write-dto'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const TRADE_JOURNAL_SETTINGS_ENDPOINT = '/users/me/trade-journal-settings'

type TradeJournalSettingWire = {
  makerFeeRate?: string | null
  takerFeeRate?: string | null
}

export class TradeJournalSettingProxy extends BackendApiProxy implements ITradeJournalSettingProxy {
  async findSetting(): Promise<TradeJournalSetting> {
    return this.toSetting(await this.requestBackend<TradeJournalSettingWire>(TRADE_JOURNAL_SETTINGS_ENDPOINT))
  }

  async saveFeeRates(writeDto: TradeFeeRatesWriteDto): Promise<TradeJournalSetting> {
    return this.toSetting(await this.requestBackend<TradeJournalSettingWire>(TRADE_JOURNAL_SETTINGS_ENDPOINT, {
      method: 'PUT',
      body: {
        makerFeeRate: writeDto.makerFeeRate?.toString() ?? null,
        takerFeeRate: writeDto.takerFeeRate?.toString() ?? null,
      },
    }))
  }

  private toSetting(settingWire: TradeJournalSettingWire | null): TradeJournalSetting {
    const makerFeeRate = settingWire?.makerFeeRate ?? null
    const takerFeeRate = settingWire?.takerFeeRate ?? null

    return new TradeJournalSetting(
      makerFeeRate === null ? null : new Decimal(makerFeeRate),
      takerFeeRate === null ? null : new Decimal(takerFeeRate),
    )
  }
}
