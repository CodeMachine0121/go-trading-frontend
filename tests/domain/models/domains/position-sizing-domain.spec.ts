import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

describe('PositionSizingDomain', () => {
  describe('旁邊那一格要不要出現', () => {
    it.each([
      ['allIn', false],
      ['percentage', true],
      ['fixedAmount', true],
    ] as const)('%s → %s', (mode, expected) => {
      expect(new PositionSizingDomain(mode, new Decimal(0)).requiresValue).toBe(expected)
    })
  })

  describe('選單上長什麼樣', () => {
    it('全押不需要那一格，因此也沒有那一格的名字', () => {
      const option = new PositionSizingDomain('allIn', new Decimal(0)).toOptionDto()

      expect(option.value).toBe('allIn')
      expect(option.label).toBe('全押')
      expect(option.requiresValue).toBe(false)
      expect(option.valueLabel).toBe('')
    })

    it('百分比帶著那一格的名字', () => {
      const option = new PositionSizingDomain('percentage', new Decimal(50)).toOptionDto()

      expect(option.requiresValue).toBe(true)
      expect(option.valueLabel).toBe('百分比')
    })
  })

  describe('那一格填的講不講得通', () => {
    it('全押連看都不看那個數字', () => {
      // 使用者從百分比切到全押，那一格留著的 50 不該讓他送不出去。
      expect(() => new PositionSizingDomain('allIn', new Decimal(Number.NaN)).validate())
        .not.toThrow()
    })

    it.each([1, 50, 100])('百分比 %s 通過', (value) => {
      expect(() => new PositionSizingDomain('percentage', new Decimal(value)).validate())
        .not.toThrow()
    })

    it.each([0, -1, 101, 150])('百分比 %s 被拒絕', (value) => {
      expect(() => new PositionSizingDomain('percentage', new Decimal(value)).validate())
        .toThrow(new BacktestFieldError('positionSizingValue', '百分比要大於零且不超過一百。'))
    })

    it('固定金額大於零就通過，多大都行', () => {
      // 資金會隨重演變動，拿初始資金當上限只是個假的安全感；
      // 而「資金不夠就跳過」本來就是系統那頭的規則。
      expect(() => new PositionSizingDomain('fixedAmount', new Decimal(999999)).validate())
        .not.toThrow()
    })

    it.each([0, -1])('固定金額 %s 被拒絕', (value) => {
      expect(() => new PositionSizingDomain('fixedAmount', new Decimal(value)).validate())
        .toThrow(new BacktestFieldError('positionSizingValue', '固定金額要大於零。'))
    })

    it('該填的那一格留白時說請填一個數字', () => {
      expect(() => new PositionSizingDomain('percentage', new Decimal(Number.NaN)).validate())
        .toThrow(new BacktestFieldError('positionSizingValue', '請填一個數字。'))
    })
  })
})
