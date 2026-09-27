import type { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import type { TradeFeeRatesWriteDto } from '~/domain/models/dto/trade-fee-rates-write-dto'

export interface ITradeJournalSettingProxy {
  findSetting(): Promise<TradeJournalSetting>
  saveFeeRates(writeDto: TradeFeeRatesWriteDto): Promise<TradeJournalSetting>
}
