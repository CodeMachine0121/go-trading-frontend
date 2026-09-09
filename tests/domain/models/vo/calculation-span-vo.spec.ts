import { describe, expect, it } from 'vitest'
import { CalculationSpanVo } from '~/domain/models/vo/calculation-span-vo'

const NOW = new Date('2026-09-03T12:00:00.000Z')

describe('要看多長：換算成一段行情', () => {
  // 使用者說的是「最近兩小時」，而那句話指的是從現在往回數的那一段行情。
  it.each([
    { name: '最近一小時', amount: 1, unit: 'hour' as const, expectedStart: '2026-09-03T11:00:00.000Z' },
    { name: '最近兩小時', amount: 2, unit: 'hour' as const, expectedStart: '2026-09-03T10:00:00.000Z' },
    { name: '最近五分鐘', amount: 5, unit: 'minute' as const, expectedStart: '2026-09-03T11:55:00.000Z' },
    { name: '最近一天', amount: 1, unit: 'day' as const, expectedStart: '2026-09-02T12:00:00.000Z' },
  ])('$name 是從現在往回推的那一段', ({ amount, unit, expectedStart }) => {
    const window = new CalculationSpanVo(amount, unit).toObservationWindow(NOW)

    expect(window.startTime).toEqual(new Date(expectedStart))
  })

  it('終點不指定——這個畫面問的一律是「最近」,右端就是現在', () => {
    // 送一個算出來的此刻過去，只會多一個會過期的數字；系統未指定時本來就當現在。
    expect(new CalculationSpanVo(2, 'hour').toObservationWindow(NOW).endTime).toBeNull()
  })

  it('換算不看彙總刻度——一段裡有幾格是系統的答案', () => {
    // 同樣的「最近一天」，全天候市場是一整天，會收盤的市場只有一個交易日的四個半小時。
    // 這一段行情本身與每根涵蓋多久無關，所以這裡連問都不問。
    const window = new CalculationSpanVo(1, 'day').toObservationWindow(NOW)

    expect(Object.keys(window)).toEqual(['startTime', 'endTime'])
  })
})

describe('要看多長：哪裡不對', () => {
  it.each([
    { name: '零', amount: 0 },
    { name: '負數', amount: -3 },
    { name: '小數', amount: 2.5 },
  ])('$name 時說出來', ({ amount }) => {
    expect(new CalculationSpanVo(amount, 'hour').validationMessage())
      .toBe('要看多長必須是大於零的整數')
  })

  it('正整數沒有話說', () => {
    expect(new CalculationSpanVo(2, 'hour').validationMessage()).toBeNull()
  })
})
