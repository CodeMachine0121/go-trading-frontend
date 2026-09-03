import {
  formatDateTimeInTimeZone,
  formatMinuteInputInTimeZone,
  parseMinuteInputInTimeZone,
} from '~/utilities/time-zone-format'

/**
 * DTO：選定的時區交給 application 與畫面的唯一形狀，**並帶著雙向換算**。
 *
 * 畫面要說一個瞬間就問它、要把使用者填的讀回瞬間也問它——
 * 換算怎麼做（日光節約時間邊界要修正兩次之類）不必外流到任何元件。
 * 這與其他 DTO 帶 `toXxx()` 是同一件事：形狀轉換，不是業務規則。
 */
export class TimeZoneDto {
  constructor(
    public readonly identifier: string,
    public readonly cityLabel: string,
    public readonly offsetLabel: string,
  ) {}

  /** 選單上的說法：`台北（UTC+08:00）`。 */
  get label(): string {
    return `${this.cityLabel}（${this.offsetLabel}）`
  }

  /** 畫面上呈現一個瞬間：`2026-08-30 12:00`。 */
  formatDateTime(instant: Date): string {
    return formatDateTimeInTimeZone(instant, this.identifier)
  }

  /** 分鐘精度時間輸入的值：`2026-08-30T12:00`。 */
  formatMinuteInput(instant: Date): string {
    return formatMinuteInputInTimeZone(instant, this.identifier)
  }

  /** 把使用者填的當地時間讀回一個瞬間；值不完整時回傳一個無效的時間值。 */
  parseMinuteInput(inputValue: string): Date {
    return parseMinuteInputInTimeZone(inputValue, this.identifier)
  }
}
