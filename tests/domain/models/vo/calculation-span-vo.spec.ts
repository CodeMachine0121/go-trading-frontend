import { describe, expect, it } from 'vitest'
import { CalculationSpanVo } from '~/domain/models/vo/calculation-span-vo'

describe('要看多長：這一段裡有幾格', () => {
  // 使用者說的是「最近兩小時」，不是「24 根」——而 24 還會隨彙總刻度改變意義。
  it.each([
    { name: '一小時、五分鐘一根 → 12 格', amount: 1, unit: 'hour' as const, intervalMinutes: 5, expected: 12 },
    { name: '一小時、一小時一根 → 1 格', amount: 1, unit: 'hour' as const, intervalMinutes: 60, expected: 1 },
    { name: '兩小時、五分鐘一根 → 24 格', amount: 2, unit: 'hour' as const, intervalMinutes: 5, expected: 24 },
    { name: '五分鐘、五分鐘一根 → 1 格', amount: 5, unit: 'minute' as const, intervalMinutes: 5, expected: 1 },
    { name: '一天、一小時一根 → 24 格', amount: 1, unit: 'day' as const, intervalMinutes: 60, expected: 24 },
    { name: '三分鐘、五分鐘一根 → 仍然是 1 格', amount: 3, unit: 'minute' as const, intervalMinutes: 5, expected: 1 },
  ])('$name', ({ amount, unit, intervalMinutes, expected }) => {
    expect(new CalculationSpanVo(amount, unit).kCandleCountAt(intervalMinutes)).toBe(expected)
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
