import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { PositionPlanDomain } from '~/domain/models/domains/position-plan-domain'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

/** 一組每一條規則都過得了的部位規劃，好讓每個案例只改它要講的那一格。 */
function aPositionPlan(overrides: Partial<{
  capital: string
  sizingMode: PositionSizingMode
  sizingValue: string
  stopLossPercentage: string
  takeProfitPercentage: string
  leverage: string | null
}> = {}) {
  return new PositionPlanDomain(new PositionPlanDto(
    new Decimal(overrides.capital ?? '50000'),
    overrides.sizingMode ?? 'percentage',
    new Decimal(overrides.sizingValue ?? '10'),
    new Decimal(overrides.stopLossPercentage ?? '3'),
    new Decimal(overrides.takeProfitPercentage ?? '5'),
    overrides.leverage === undefined || overrides.leverage === null ? null : new Decimal(overrides.leverage),
  ))
}

describe('PositionPlanDomain', () => {
  it('四格都填對就送得出去', () => {
    expect(aPositionPlan().rejection).toBeNull()
    expect(aPositionPlan().isSendable).toBe(true)
  })

  it.each([
    ['全押不必填數字', { sizingMode: 'allIn' as PositionSizingMode, sizingValue: '0' }],
    ['不設止損', { stopLossPercentage: '0' }],
    ['不設止盈', { takeProfitPercentage: '0' }],
    ['兩個出口都不設', { stopLossPercentage: '0', takeProfitPercentage: '0' }],
    ['整個價格那麼遠的止損——荒謬但算得出來', { stopLossPercentage: '100' }],
  ])('%s 也送得出去', (_name, overrides) => {
    expect(aPositionPlan(overrides).rejection).toBeNull()
  })

  // 押多少那兩條是**委派**給回測那一列已經在用的模型，而不是重寫。
  // 這兩條釘的就是那件事：措辭要與那一列一字不差。
  it.each([
    ['百分比超過一百', { sizingValue: '150' }, '百分比要大於零且不超過一百'],
    ['百分比是零', { sizingValue: '0' }, '百分比要大於零且不超過一百'],
    [
      '固定金額是零',
      { sizingMode: 'fixedAmount' as PositionSizingMode, sizingValue: '0' },
      '固定金額要大於零',
    ],
  ])('%s 就送不出去', (_name, overrides, expectedWords) => {
    expect(aPositionPlan(overrides).rejection).toContain(expectedWords)
  })

  it.each([
    ['停損距離是負的', { stopLossPercentage: '-3' }, '停損距離不得為負'],
    ['停損距離超過一百', { stopLossPercentage: '120' }, '停損距離不得超過 100%'],
    ['停利距離是負的', { takeProfitPercentage: '-5' }, '停利距離不得為負'],
    ['停利距離超過一百', { takeProfitPercentage: '120' }, '停利距離不得超過 100%'],
  ])('%s 就送不出去', (_name, overrides, expectedWords) => {
    expect(aPositionPlan(overrides).rejection).toContain(expectedWords)
  })

  it('一次只說一個理由', () => {
    // 使用者一次只改得動一格，而一張同時亮起四個紅字的表單，
    // 第一個反應是不知道要從哪裡開始。
    const rejection = aPositionPlan({
      sizingValue: '150', stopLossPercentage: '-3',
    }).rejection

    expect(rejection).toContain('百分比要大於零且不超過一百')
    expect(rejection).not.toContain('停損')
  })

  it('現貨機器人的這一組不問借多少：沒說槓桿就是沒有這一格', () => {
    // 只有合約機器人有槓桿；現貨那一組沒有給就是 null，而不是一個會被讀成「一倍」的數字。
    const positionPlan = new PositionPlanDto(
      new Decimal('50000'), 'percentage', new Decimal('10'),
      new Decimal('3'), new Decimal('5'))

    expect(positionPlan.leverage).toBeNull()
    expect(new PositionPlanDomain(positionPlan).rejection).toBeNull()
  })
})

describe('PositionPlanDomain 的槓桿倍數', () => {
  it.each([
    { name: '現貨機器人沒有這一格，什麼都不問', leverage: null, expected: null },
    { name: '一倍送得出去', leverage: '1', expected: null },
    { name: '五倍送得出去', leverage: '5', expected: null },
    { name: '小於一擋下', leverage: '0.5', expected: '槓桿倍數不得小於 1 倍' },
    { name: '零也擋下', leverage: '0', expected: '槓桿倍數不得小於 1 倍' },
  ])('$name', ({ leverage, expected }) => {
    expect(aPositionPlan({ leverage }).rejection).toBe(expected)
  })
})
