import { TimeZoneDomain } from '~/domain/models/domains/time-zone-domain'

/**
 * Entity：一個可選時區在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 以 IANA 識別字唯一辨識（`UTC`、`Asia/Taipei`），城市名是畫面上叫它什麼。
 */
export class TimeZone {
  constructor(
    public readonly identifier: string,
    public readonly cityLabel: string,
  ) {}

  toDomain(): TimeZoneDomain {
    return new TimeZoneDomain(this)
  }
}
