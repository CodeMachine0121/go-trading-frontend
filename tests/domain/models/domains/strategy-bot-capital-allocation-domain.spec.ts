import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { StrategyBotCapitalAllocationDomain } from '~/domain/models/domains/strategy-bot-capital-allocation-domain'
import { StrategyBotCapitalAllocationDto } from '~/domain/models/dto/strategy-bot-capital-allocation-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

const SEVEN_SYMBOLS = ['A1USDT', 'A2USDT', 'A3USDT', 'A4USDT', 'A5USDT', 'A6USDT', 'A7USDT']

function allocationsOf(percentages: Partial<Record<string, string>>): StrategyBotCapitalAllocationDto[] {
  return Object.entries(percentages).flatMap(([symbol, percentage]) =>
    percentage === undefined ? [] : [new StrategyBotCapitalAllocationDto(symbol, new Decimal(percentage))])
}

function percentagesOf(allocations: readonly StrategyBotCapitalAllocationDto[]): Record<string, string> {
  return Object.fromEntries(allocations.map(allocation => [allocation.symbol, allocation.allocationPercentage.toString()]))
}

function anAllocation(percentages: Partial<Record<string, string>>, symbols: string[] = Object.keys(percentages)) {
  return new StrategyBotCapitalAllocationDomain(symbols, allocationsOf(percentages))
}

describe('StrategyBotCapitalAllocationDomain 的平均分配', () => {
  it.each([
    { name: '一個標的', symbols: ['BTCUSDT'], expected: '100' },
    { name: '兩個標的', symbols: ['BTCUSDT', 'ETHUSDT'], expected: '50' },
    { name: '三個標的捨去零頭', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], expected: '33.33' },
    { name: '七個標的', symbols: SEVEN_SYMBOLS, expected: '14.28' },
  ])('$name 時每個標的分配 $expected', ({ symbols, expected }) => {
    const equalSplit = new StrategyBotCapitalAllocationDomain(symbols, []).equallySplit()

    expect(equalSplit.map(allocation => allocation.symbol)).toEqual(symbols)
    expect(equalSplit.every(allocation => allocation.allocationPercentage.toString() === expected)).toBe(true)
  })
})

describe('StrategyBotCapitalAllocationDomain 加減監聽標的', () => {
  it.each([
    {
      name: '還沒有標的時加入第一個',
      before: {},
      symbols: ['BTCUSDT'],
      expected: { BTCUSDT: '100' },
    },
    {
      name: '沒改過時加入第二個',
      before: { BTCUSDT: '100' },
      symbols: ['BTCUSDT', 'ETHUSDT'],
      expected: { BTCUSDT: '50', ETHUSDT: '50' },
    },
    {
      name: '沒改過時加入第三個',
      before: { BTCUSDT: '50', ETHUSDT: '50' },
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      expected: { BTCUSDT: '33.33', ETHUSDT: '33.33', SOLUSDT: '33.33' },
    },
    {
      name: '改過之後加入的那一個留空',
      before: { BTCUSDT: '70', ETHUSDT: '30' },
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      expected: { BTCUSDT: '70', ETHUSDT: '30' },
    },
    {
      name: '改過之後拿掉一個',
      before: { BTCUSDT: '70', ETHUSDT: '30' },
      symbols: ['BTCUSDT'],
      expected: { BTCUSDT: '70' },
    },
  ])('$name', ({ before, symbols, expected }) => {
    const reallocated = anAllocation(before).reallocatedTo(symbols)

    expect(percentagesOf(reallocated)).toEqual(expected)
  })

  it.each([
    { name: '各 50', percentages: { BTCUSDT: '50', ETHUSDT: '50' }, expected: true },
    { name: '70 與 30', percentages: { BTCUSDT: '70', ETHUSDT: '30' }, expected: false },
    { name: '少一格', percentages: { BTCUSDT: '50' }, symbols: ['BTCUSDT', 'ETHUSDT'], expected: false },
  ])('$name 是不是平均分配：$expected', ({ percentages, symbols, expected }) => {
    expect(anAllocation(percentages, symbols).isEqualSplit).toBe(expected)
  })
})

describe('StrategyBotCapitalAllocationDomain 送出前的規則', () => {
  it.each([
    { name: '合計正好 100', percentages: { BTCUSDT: '60', ETHUSDT: '40' } },
    { name: '合計少於 100', percentages: { BTCUSDT: '30', ETHUSDT: '30' } },
    { name: '一個標的 100', percentages: { BTCUSDT: '100' } },
    { name: '兩位小數', percentages: { BTCUSDT: '33.33', ETHUSDT: '33.33', SOLUSDT: '33.33' } },
  ])('$name 送得出去', ({ percentages }) => {
    expect(anAllocation(percentages).rejection).toBeNull()
  })

  it('一格都沒給就是不給，交給交易服務決定', () => {
    expect(new StrategyBotCapitalAllocationDomain(['BTCUSDT', 'ETHUSDT'], []).rejection).toBeNull()
  })

  it.each([
    {
      name: '缺了一個標的',
      percentages: { BTCUSDT: '70', ETHUSDT: '30' },
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      message: 'SOLUSDT 沒有分配比例——要嘛每個監聽標的都給，要嘛都不給',
    },
    { name: '分配比例為零', percentages: { BTCUSDT: '0' }, message: 'BTCUSDT 的分配比例必須大於 0、不超過 100（單位：%）' },
    { name: '分配比例超過 100', percentages: { BTCUSDT: '100.5' }, message: 'BTCUSDT 的分配比例必須大於 0、不超過 100（單位：%）' },
    { name: '打不出數字', percentages: { BTCUSDT: 'NaN' }, message: 'BTCUSDT 的分配比例必須大於 0、不超過 100（單位：%）' },
    { name: '超過兩位小數', percentages: { BTCUSDT: '33.333' }, message: 'BTCUSDT 的分配比例最多到小數點後兩位' },
    { name: '合計超過 100', percentages: { BTCUSDT: '70', ETHUSDT: '40' }, message: '分配比例加起來是 110%，不得超過 100%' },
  ])('$name 就擋下並說「$message」', ({ percentages, symbols, message }) => {
    expect(anAllocation(percentages, symbols).rejection?.in('zh-TW')).toBe(message)
  })

  it('英文也說出是哪一個標的', () => {
    expect(anAllocation({ BTCUSDT: '0' }).rejection?.in('en')).toContain('BTCUSDT')
  })
})

describe('StrategyBotCapitalAllocationDomain 的摘要', () => {
  function summaryOf(
    percentages: Partial<Record<string, string>>,
    capital: string | null,
    sizingMode: PositionSizingMode = 'allIn',
    sizingValue = '0',
  ) {
    return anAllocation(percentages).toSummaryDto(
      capital === null ? null : new Decimal(capital), sizingMode, new Decimal(sizingValue))
  }

  it.each([
    { name: '合計正好 100', percentages: { BTCUSDT: '60', ETHUSDT: '40' }, total: '100', unallocated: '0', over: false },
    { name: '合計少於 100', percentages: { BTCUSDT: '30', ETHUSDT: '30' }, total: '60', unallocated: '40', over: false },
    { name: '三個平均', percentages: { BTCUSDT: '33.33', ETHUSDT: '33.33', SOLUSDT: '33.33' }, total: '99.99', unallocated: '0.01', over: false },
    { name: '合計超過 100', percentages: { BTCUSDT: '70', ETHUSDT: '40' }, total: '110', unallocated: '0', over: true },
  ])('$name：合計 $total%，未動用 $unallocated%', ({ percentages, total, unallocated, over }) => {
    const summary = summaryOf(percentages, null)

    expect(summary.totalPercentage.toString()).toBe(total)
    expect(summary.unallocatedPercentage.toString()).toBe(unallocated)
    expect(summary.isOverAllocated).toBe(over)
  })

  it('七個標的未動用 0.04%', () => {
    const equalSplit = new StrategyBotCapitalAllocationDomain(SEVEN_SYMBOLS, []).equallySplit()

    const summary = new StrategyBotCapitalAllocationDomain(SEVEN_SYMBOLS, equalSplit)
      .toSummaryDto(null, 'allIn', new Decimal(0))

    expect(summary.unallocatedPercentage.toString()).toBe('0.04')
  })

  it.each([
    { name: '分到的資金不取整', percentages: { BTCUSDT: '33.33' }, capital: '1000', sizingMode: 'allIn' as const, sizingValue: '0', allocated: '333.3', shortfall: null },
    { name: '總金額空白', percentages: { BTCUSDT: '50' }, capital: null, sizingMode: 'allIn' as const, sizingValue: '0', allocated: null, shortfall: null },
    { name: '總金額是零', percentages: { BTCUSDT: '50' }, capital: '0', sizingMode: 'allIn' as const, sizingValue: '0', allocated: null, shortfall: null },
    { name: '押不下固定金額', percentages: { BTCUSDT: '50' }, capital: '50', sizingMode: 'fixedAmount' as const, sizingValue: '50', allocated: '25', shortfall: '分到的資金不足，押不下 50' },
    { name: '正好押得下', percentages: { BTCUSDT: '50' }, capital: '100', sizingMode: 'fixedAmount' as const, sizingValue: '50', allocated: '50', shortfall: null },
    { name: '全押永遠押得下', percentages: { BTCUSDT: '50' }, capital: '50', sizingMode: 'allIn' as const, sizingValue: '50', allocated: '25', shortfall: null },
    { name: '百分比不提醒', percentages: { BTCUSDT: '50' }, capital: '50', sizingMode: 'percentage' as const, sizingValue: '80', allocated: '25', shortfall: null },
    { name: '分配比例不合法時不說分到多少', percentages: { BTCUSDT: '120' }, capital: '1000', sizingMode: 'allIn' as const, sizingValue: '0', allocated: null, shortfall: null },
  ])('$name', ({ percentages, capital, sizingMode, sizingValue, allocated, shortfall }) => {
    const row = summaryOf(percentages, capital, sizingMode, sizingValue).rows[0]

    expect(row?.symbol).toBe('BTCUSDT')
    expect(row?.allocatedCapital?.toString() ?? null).toBe(allocated)
    expect(row?.shortfallLabel?.in('zh-TW') ?? null).toBe(shortfall)
  })

  it('沒給分配比例的那一列也列出來，只是不說分到多少', () => {
    const summary = anAllocation({ BTCUSDT: '70' }, ['BTCUSDT', 'ETHUSDT'])
      .toSummaryDto(new Decimal(1000), 'allIn', new Decimal(0))

    expect(summary.rows.map(row => row.symbol)).toEqual(['BTCUSDT', 'ETHUSDT'])
    expect(summary.rows[1]?.allocatedCapital).toBeNull()
  })
})
