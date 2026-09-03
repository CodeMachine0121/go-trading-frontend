import { TimeZoneService } from '~/domain/service/time-zone-service'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

/**
 * 選定的時區。它是資料，不是替身——由真的 domain service 取出來，
 * 因此帶著真的換算能力（`formatDateTime` / `parseMinuteInput`）。
 *
 * 每個會顯示時間的元件測試都需要它，預設給世界標準時間：
 * 這樣既有的測試不必因為多了一個時區而改掉每一個時間字串。
 */
export function buildTimeZone(identifier = 'UTC'): TimeZoneDto {
  return new TimeZoneService({
    readSelectedTimeZoneIdentifier: () => null,
    writeSelectedTimeZoneIdentifier: () => {},
  }).findTimeZone(identifier)
}
