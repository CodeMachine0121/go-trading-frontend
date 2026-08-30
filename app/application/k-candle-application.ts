import type { KCandleService } from '~/domain/service/k-candle-service'
import type { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import type { KCandleIdentityDto } from '~/domain/models/dto/k-candle-identity-dto'

/**
 * Application：K 線的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class KCandleApplication {
  constructor(private readonly kCandleService: KCandleService) {}

  async searchKCandles(kCandleQueryDto: KCandleQueryDto): Promise<KCandleSearchResultDto> {
    return this.kCandleService.searchKCandles(kCandleQueryDto)
  }

  buildDefaultQuery(symbol: string): KCandleQueryDto {
    return this.kCandleService.buildDefaultQuery(symbol)
  }

  async saveKCandle(kCandleWriteDto: KCandleWriteDto): Promise<KCandleDto> {
    return this.kCandleService.saveKCandle(kCandleWriteDto)
  }

  async updateKCandle(kCandleWriteDto: KCandleWriteDto): Promise<KCandleDto> {
    return this.kCandleService.updateKCandle(kCandleWriteDto)
  }

  async deleteKCandle(kCandleIdentityDto: KCandleIdentityDto): Promise<void> {
    return this.kCandleService.deleteKCandle(kCandleIdentityDto)
  }

  buildNewKCandleDraft(symbol: string): KCandleWriteDto {
    return this.kCandleService.buildNewKCandleDraft(symbol)
  }
}
