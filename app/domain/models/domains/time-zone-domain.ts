import type { TimeZone } from '~/domain/models/entities/time-zone'
import { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { formatUtcOffsetLabel } from '~/utilities/time-zone-format'

/**
 * Domain Model：解讀一個時區。
 *
 * 位移不是固定的——同一個時區在日光節約時間前後差一小時，
 * 因此它一律是「在某個瞬間」算出來的，預設是現在。
 */
export class TimeZoneDomain {
  constructor(private readonly timeZone: TimeZone) {}

  /** 該時區在那個瞬間相對於世界標準時間的位移標籤：`UTC+08:00`。 */
  offsetLabelAt(instant: Date): string {
    return formatUtcOffsetLabel(instant, this.timeZone.identifier)
  }

  /** 選單上的說法：`台北（UTC+08:00）`／`Taipei (UTC+08:00)`——括號照各自語言的寫法。 */
  toDtoAt(instant: Date): TimeZoneDto {
    const offsetLabel = this.offsetLabelAt(instant)
    const { cityName } = this.timeZone

    return new TimeZoneDto(
      this.timeZone.identifier,
      cityName,
      offsetLabel,
      new LocalizedTextVo(
        `${cityName.traditionalChinese}（${offsetLabel}）`,
        `${cityName.english} (${offsetLabel})`,
      ),
    )
  }
}
