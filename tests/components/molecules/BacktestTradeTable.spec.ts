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

describe('BacktestTradeTable 空表格的兩種原因', () => {
  function mountEmptyTable(hasOpenPosition: boolean, showTransactionCosts = false) {
    return mount(BacktestTradeTable, {
      props: {
        closedTrades: [], timeZone: buildTimeZone('UTC'), hasOpenPosition,
        showTransactionCosts,
      },
    })
  }

  it('還抱著一注時說出那件事，而不是說沒有觸發任何交易', () => {
    // 一支每一棒都說買入的算式會開一注抱到最後。說它「沒有觸發任何交易」是錯的，
    // 而那句附帶的理由還會把人推去懷疑一個沒有問題的地方。
    const wrapper = mountEmptyTable(true)

    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text())
      .toContain('開了倉但還沒平掉')
    expect(wrapper.find('[data-testid="no-trades"]').exists()).toBe(false)
  })

  it.each([true, false])('那句話裡沒有夾雜空白（收過錢＝%s）', (showTransactionCosts) => {
    // 樣板裡換一行，渲染出來就是句子中間多一個空格——中文看得出來，而且
    // 只有把整段字唸過去才會發現。這一條讓它不可能悄悄回來。
    const wrapper = mountEmptyTable(true, showTransactionCosts)

    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text())
      .not.toMatch(/\s/)
  })

  it('收過錢時說出那一注的錢去了哪兩格', () => {
    // 「交易次數 0 卻有交易成本」正是這一句要解開的矛盾。
    const wrapper = mountEmptyTable(true, true)

    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text())
      .toContain('最後剩多少')
    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text())
      .toContain('交易成本')
  })

  it('沒收過錢時不叫人去看一格不存在的數字', () => {
    // 沒給費率的那一次重演，成績單上根本沒有「交易成本」那一格。
    const wrapper = mountEmptyTable(true, false)

    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text())
      .toContain('最後剩多少')
    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text())
      .not.toContain('交易成本')
  })

  it('真的一次都沒開倉時那句話一字不變', () => {
    const wrapper = mountEmptyTable(false)

    expect(wrapper.get('[data-testid="no-trades"]').text())
      .toBe('這段期間沒有觸發任何交易。算式可以從頭到尾都說持平，這不算失敗。')
    expect(wrapper.find('[data-testid="no-closed-trades-yet"]').exists()).toBe(false)
  })

  it('有交易明細時兩句話都不出現', () => {
    const wrapper = mountTable([tradeOf('1000', 'positive')], 'UTC', false)

    expect(wrapper.find('[data-testid="no-trades"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="no-closed-trades-yet"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="trade-row"]')).toHaveLength(1)
  })
})

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
