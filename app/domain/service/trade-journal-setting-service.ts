import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import type { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeJournalSettingDomain } from '~/domain/models/domains/trade-journal-setting-domain'
import { TradeTagDomain } from '~/domain/models/domains/trade-tag-domain'
import type { TradeFailureDto } from '~/domain/models/dto/trade-failure-dto'
import { TradeFailureDomain } from '~/domain/models/domains/trade-failure-domain'

export class TradeJournalSettingService {
  constructor(
    private readonly tradeJournalSettingProxy: ITradeJournalSettingProxy,
    private readonly tradeTagProxy: ITradeTagProxy,
  ) {}

  describeFailure(error: unknown): TradeFailureDto {
    return new TradeFailureDomain(error).toDto()
  }

  async getSetting(): Promise<TradeJournalSettingDto> {
    return new TradeJournalSettingDomain(await this.tradeJournalSettingProxy.findSetting()).toDto()
  }

  async saveFeeRates(makerRateText: string, takerRateText: string): Promise<TradeJournalSettingDto> {
    const writeDto = new TradeJournalSettingDomain(new TradeJournalSetting(null, null))
      .toFeeRatesWriteDto(makerRateText, takerRateText)

    return new TradeJournalSettingDomain(await this.tradeJournalSettingProxy.saveFeeRates(writeDto)).toDto()
  }

  rateInputHint(rateText: string): string | null {
    return new TradeJournalSettingDomain(new TradeJournalSetting(null, null)).rateInputHint(rateText)
  }

  async listTagGroups(): Promise<TradeTagGroupDto[]> {
    return new TradeTagDomain(await this.tradeTagProxy.listTags()).toGroupDtos()
  }

  async createTag(writeDto: TradeTagWriteDto): Promise<TradeTagDto> {
    return (await this.tradeTagProxy.createTag(new TradeTagWriteDto(writeDto.kind, writeDto.name.trim()))).toDto()
  }

  async renameTag(id: number, name: string): Promise<TradeTagDto> {
    return (await this.tradeTagProxy.renameTag(id, name.trim())).toDto()
  }

  async deleteTag(id: number): Promise<void> {
    await this.tradeTagProxy.deleteTag(id)
  }
}
