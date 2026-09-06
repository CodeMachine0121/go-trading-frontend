import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestTradeTable from '~/components/molecules/BacktestTradeTable.vue'
import { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

const ENTRY_TIME = new Date('2026-09-01T04:00:00Z')
const EXIT_TIME = new Date('2026-09-02T04:00:00Z')

function tradeOf(profit: string, tone: 'positive' | 'negative' | 'neutral'): ClosedTradeDto {
  return new ClosedTradeDto('做多', ENTRY_TIME, '100', EXIT_TIME, '110', profit, tone)
}

function mountTable(closedTrades: ClosedTradeDto[], timeZoneIdentifier = 'UTC') {
  return mount(BacktestTradeTable, {
    props: { closedTrades, timeZone: buildTimeZone(timeZoneIdentifier) },
  })
}

describe('BacktestTradeTable', () => {
  it('一筆一列，每一列交代方向、兩端的時間與價格、以及賺賠', () => {
    const wrapper = mountTable([tradeOf('1000', 'positive')])

    const cells = wrapper.findAll('[data-testid="trade-row"] td').map(cell => cell.text())
    expect(cells).toEqual(['做多', '2026-09-01 04:00', '100', '2026-09-02 04:00', '110', '1000'])
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
    // 空白讓人以為壞了，明講讓人知道是策略沒開口。
    const wrapper = mountTable([])

    expect(wrapper.get('[data-testid="no-trades"]').text())
      .toContain('這段期間沒有觸發任何交易')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
