import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { AutoOrderPositionDomain } from '~/domain/models/domains/auto-order-position-domain'
import { AutoOrderPositionVo } from '~/domain/models/vo/auto-order-position-vo'

describe('AutoOrderPositionDomain', () => {
  it.each([
    { direction: 'long', quantity: '0.002', zh: '多 0.002', en: 'Long 0.002' },
    { direction: 'short', quantity: '0.5', zh: '空 0.5', en: 'Short 0.5' },
    { direction: 'flat', quantity: '0', zh: '空手', en: 'Flat' },
    // 說成某個方向是在告訴他機器人替他拿著一筆它其實沒有的倉位。
    { direction: 'long', quantity: '0', zh: '空手', en: 'Flat' },
    { direction: 'sideways', quantity: '1', zh: '空手', en: 'Flat' },
  ])('$direction $quantity 說成「$zh」', ({ direction, quantity, zh, en }) => {
    const label = new AutoOrderPositionDomain(new AutoOrderPositionVo(direction, new Decimal(quantity))).toLabel()

    expect(label.in('zh-TW')).toBe(zh)
    expect(label.in('en')).toBe(en)
  })
})
