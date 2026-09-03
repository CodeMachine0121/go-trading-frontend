import type { TimeZoneService } from '~/domain/service/time-zone-service'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

/**
 * Application：顯示時區的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class TimeZoneApplication {
  constructor(private readonly timeZoneService: TimeZoneService) {}

  listSelectableTimeZones(): TimeZoneDto[] {
    return this.timeZoneService.listSelectableTimeZones()
  }

  findTimeZone(identifier: string): TimeZoneDto {
    return this.timeZoneService.findTimeZone(identifier)
  }

  restoreSelectedTimeZone(): TimeZoneDto {
    return this.timeZoneService.restoreSelectedTimeZone()
  }

  selectTimeZone(identifier: string): TimeZoneDto {
    return this.timeZoneService.selectTimeZone(identifier)
  }
}
