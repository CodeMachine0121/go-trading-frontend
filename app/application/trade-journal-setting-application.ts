import type { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import type { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import type { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import type { TradeFailureDto } from '~/domain/models/dto/trade-failure-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class TradeJournalSettingApplication {
  constructor(private readonly tradeJournalSettingService: TradeJournalSettingService) {}

  describeFailure(error: unknown): TradeFailureDto {
    return this.tradeJournalSettingService.describeFailure(error)
  }

  async getSetting(): Promise<TradeJournalSettingDto> {
    return this.tradeJournalSettingService.getSetting()
  }

  async saveFeeRates(makerRateText: string, takerRateText: string): Promise<TradeJournalSettingDto> {
    return this.tradeJournalSettingService.saveFeeRates(makerRateText, takerRateText)
  }

  rateInputHint(rateText: string): LocalizedTextVo | null {
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
