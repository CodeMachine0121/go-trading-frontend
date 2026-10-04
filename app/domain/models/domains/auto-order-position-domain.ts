import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { AutoOrderPositionVo } from '~/domain/models/vo/auto-order-position-vo'

/**
 * Domain Model：機器人持倉怎麼說。
 *
 * 「多 0.002」「空 0.002」或「空手」。認不得的方向、或數量不是正的，一律說空手——
 * 說成某個方向是在告訴他機器人替他拿著一筆它其實沒有的倉位。
 */
export class AutoOrderPositionDomain {
  constructor(private readonly position: AutoOrderPositionVo) {}

  toLabel(): LocalizedTextVo {
    const quantity = this.position.quantity.toString()

    if (this.position.quantity.greaterThan(0)) {
      if (this.position.direction === 'long') {
        return new LocalizedTextVo(`多 ${quantity}`, `Long ${quantity}`)
      }
      if (this.position.direction === 'short') {
        return new LocalizedTextVo(`空 ${quantity}`, `Short ${quantity}`)
      }
    }

    return new LocalizedTextVo('空手', 'Flat')
  }
}
