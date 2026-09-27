import type { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import type { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import type { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'

export class TradeJournalSettingApplication {
  constructor(private readonly tradeJournalSettingService: TradeJournalSettingService) {}

  async getSetting(): Promise<TradeJournalSettingDto> {
    return this.tradeJournalSettingService.getSetting()
  }

  async saveFeeRates(makerRateText: string, takerRateText: string): Promise<TradeJournalSettingDto> {
    return this.tradeJournalSettingService.saveFeeRates(makerRateText, takerRateText)
  }

  rateInputHint(rateText: string): string | null {
    return this.tradeJournalSettingService.rateInputHint(rateText)
  }

  async listTagGroups(): Promise<TradeTagGroupDto[]> {
    return this.tradeJournalSettingService.listTagGroups()
  }

  async createTag(writeDto: TradeTagWriteDto): Promise<TradeTagDto> {
    return this.tradeJournalSettingService.createTag(writeDto)
  }

  async renameTag(id: number, name: string): Promise<TradeTagDto> {
    return this.tradeJournalSettingService.renameTag(id, name)
  }

  async deleteTag(id: number): Promise<void> {
    await this.tradeJournalSettingService.deleteTag(id)
  }
}
