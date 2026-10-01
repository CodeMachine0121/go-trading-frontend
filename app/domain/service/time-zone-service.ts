import type { ITimeZonePreferenceProxy } from '~/domain/interface/i-time-zone-preference-proxy'
import { TimeZone } from '~/domain/models/entities/time-zone'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 可選的時區。第一個是預設，也是任何看不懂的識別字的退路——
 * 後端收發一律世界標準時間，因此它永遠說得通。
 * 清單內每一個時區的位移都是五分鐘的整數倍，K 線的五分鐘刻度在任何一個之下都仍看得出來。
 */
const SELECTABLE_TIME_ZONES = [
  new TimeZone('UTC', new LocalizedTextVo('世界標準時間', 'UTC')),
  new TimeZone('Asia/Taipei', new LocalizedTextVo('台北', 'Taipei')),
  new TimeZone('Asia/Tokyo', new LocalizedTextVo('東京', 'Tokyo')),
  new TimeZone('Asia/Hong_Kong', new LocalizedTextVo('香港', 'Hong Kong')),
  new TimeZone('Asia/Singapore', new LocalizedTextVo('新加坡', 'Singapore')),
  // 澳洲只收布里斯本：它全年不實施日光節約時間，其餘澳洲城市會隨季節換位移。
  new TimeZone('Australia/Brisbane', new LocalizedTextVo('布里斯本', 'Brisbane')),
  new TimeZone('Europe/London', new LocalizedTextVo('倫敦', 'London')),
  new TimeZone('America/New_York', new LocalizedTextVo('紐約', 'New York')),
]

/**
 * Domain Service：顯示時區的三個用例。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 */
export class TimeZoneService {
  constructor(private readonly timeZonePreferenceProxy: ITimeZonePreferenceProxy) {}

  /** 可選的時區，各自標出**目前**相對於世界標準時間的位移。 */
  listSelectableTimeZones(): TimeZoneDto[] {
    const currentTime = new Date()

    return SELECTABLE_TIME_ZONES.map(timeZone => timeZone.toDomain().toDtoAt(currentTime))
  }

  /**
   * 依識別字取一個時區，不記住任何東西——畫面持有的是識別字（它能安全地跨越
   * 伺服器端與瀏覽器端），要說時間時再用它換回帶著換算能力的那個形狀。
   * 看不懂的識別字一律退回世界標準時間。
   */
  findTimeZone(identifier: string): TimeZoneDto {
    return this.resolveTimeZone(identifier)
  }

  /** 讀回這台裝置記住的時區；沒記住、或記住的不在清單上，一律退回世界標準時間。 */
  restoreSelectedTimeZone(): TimeZoneDto {
    return this.resolveTimeZone(this.timeZonePreferenceProxy.readSelectedTimeZoneIdentifier())
  }

  /** 選定一個時區並記住它。看不懂的識別字一律退回世界標準時間，記住的也是退回後的那一個。 */
  selectTimeZone(identifier: string): TimeZoneDto {
    const selectedTimeZone = this.resolveTimeZone(identifier)
    this.timeZonePreferenceProxy.writeSelectedTimeZoneIdentifier(selectedTimeZone.identifier)

    return selectedTimeZone
  }

  /** 清單裡有就是它，否則退回第一個（世界標準時間）。 */
  private resolveTimeZone(identifier: string | null): TimeZoneDto {
    const [defaultTimeZone] = SELECTABLE_TIME_ZONES
    const matchedTimeZone = SELECTABLE_TIME_ZONES.find(
      timeZone => timeZone.identifier === identifier)

    return (matchedTimeZone ?? defaultTimeZone).toDomain().toDtoAt(new Date())
  }
}
