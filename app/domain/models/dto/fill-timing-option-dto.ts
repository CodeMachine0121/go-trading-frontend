import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { FillTiming } from '~/domain/models/vo/fill-timing-vo'

/** DTO：成交時點選單的一個選項，連同它旁邊那一句說明。 */
export class FillTimingOptionDto {
  constructor(
    public readonly value: FillTiming,
    public readonly label: LocalizedTextVo,
    public readonly description: LocalizedTextVo,
  ) {}
}
