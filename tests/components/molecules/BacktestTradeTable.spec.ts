import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestTradeTable from '~/components/molecules/BacktestTradeTable.vue'
import { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

const ENTRY_TIME = new Date('2026-09-01T04:00:00Z')
const EXIT_TIME = new Date('2026-09-02T04:00:00Z')

function tradeOf(
  profit: string,
  tone: 'positive' | 'negative' | 'neutral',
  exitReasonLabel = '訊號',
  entryCost = '0.00',
  exitCost = '0.00',
): ClosedTradeDto {
  return new ClosedTradeDto(
    '做多', ENTRY_TIME, '100', EXIT_TIME, '110', profit, tone, exitReasonLabel,
    entryCost, exitCost)
}

function mountTable(
  closedTrades: ClosedTradeDto[], timeZoneIdentifier = 'UTC', showTransactionCosts = false,
) {
  return mount(BacktestTradeTable, {
    props: {
      closedTrades, timeZone: buildTimeZone(timeZoneIdentifier), showTransactionCosts,
    },
  })
}

describe('BacktestTradeTable 的成本欄', () => {
  it('收過錢才多那兩欄，每一列說出自己付了多少', () => {
    const wrapper = mountTable(
      [tradeOf('790', 'positive', '訊號', '100.00', '110.00')], 'UTC', true)

    expect(wrapper.get('[data-testid="trade-entry-cost"]').text()).toBe('100.00')
    expect(wrapper.get('[data-testid="trade-exit-cost"]').text()).toBe('110.00')
  })

  it('收過錢時賺賠那一欄說明自己是淨額', () => {
    // 不說的話，有人會拿進出場價自己心算，然後對不起來。
    const wrapper = mountTable([tradeOf('790', 'positive')], 'UTC', true)

    expect(wrapper.text()).toContain('賺賠（已扣成本）')
  })

  it('沒收過錢就一欄都不多，那張表寬度不變', () => {
    const wrapper = mountTable([tradeOf('1000', 'positive')])

    expect(wrapper.find('[data-testid="trade-entry-cost"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="trade-exit-cost"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('已扣成本')
  })
})

describe('BacktestTradeTable', () => {
  it('一筆一列，每一列交代方向、兩端的時間與價格、怎麼出場、以及賺賠', () => {
    const wrapper = mountTable([tradeOf('1000', 'positive')])

    // 「怎麼出場」擺在出場價之後、賺賠之前：它說的是那一次出場的事。
    const cells = wrapper.findAll('[data-testid="trade-row"] td').map(cell => cell.text())
    expect(cells).toEqual([
      '做多', '2026-09-01 04:00', '100', '2026-09-02 04:00', '110', '訊號', '1000'])
  })

  it.each([
    ['被停損掃出場的那一筆', '止損'],
    ['被停利帶走的那一筆', '止盈'],
    ['靡訊號出場的那一筆', '訊號'],
  ])('%s 自己說出來', (_name, expectedLabel) => {
    // 總數答得出「有幾筆」、答不出「是哪幾筆」——
    // 而看這張明細的人問的正是後者。
    const wrapper = mountTable([tradeOf('1000', 'positive', expectedLabel)])

    expect(wrapper.get('[data-testid="trade-exit-reason"]').text()).toBe(expectedLabel)
  })

  it('時間照使用者選的顯示時區寫出來', () => {
    // 同一頁上其他說時間的地方也是這個時區——一頁上兩種說法比說錯還糟。
    const wrapper = mountTable([tradeOf('1000', 'positive')], 'Asia/Taipei')

    expect(wrapper.get('[data-testid="trade-row"]').text()).toContain('2026-09-01 12:00')
  })

  it('表頭寫出時間是哪個時區的', () => {
    const wrapper = mountTable([tradeOf('1000', 'positive')], 'Asia/Taipei')

    expect(wrapper.text()).toContain('台北')
  })

  it.each([
    ['positive', '--positive'],
    ['negative', '--negative'],
    ['neutral', '--neutral'],
  ] as const)('賺賠的色調 %s 照 DTO 說的來', (tone, expectedSuffix) => {
    const wrapper = mountTable([tradeOf('300', tone)])

    expect(wrapper.get('[data-testid="trade-profit"]').classes()
      .some(name => name.endsWith(expectedSuffix))).toBe(true)
  })

  it('一筆都沒有時明講，而不是一張空白表格', () => {
    // 空白讓人以為壞了，明講讓人知道是策略腳本沒開口。
    const wrapper = mountTable([])

    expect(wrapper.get('[data-testid="no-trades"]').text())
      .toContain('這段期間沒有觸發任何交易')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
