import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BacktestRunDetailDialog from '~/components/organisms/BacktestRunDetailDialog.vue'
import {
  Backtest,
  BacktestTradeStatistics,
  ClosedTrade,
  ContractBacktestFigures,
  ContractTradeFigures,
  EquityPoint,
} from '~/domain/models/entities/backtest'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { buildBacktestRun, RUN_END, RUN_START } from '../../fixtures/backtest-run'
import { buildTimeZone } from '../../fixtures/time-zone'

// 繪圖函式庫是最外層的邊界：它需要真正的畫布，而這裡要驗的不是它畫得對不對。
const chartLibrary = vi.hoisted(() => {
  const lineSeries = { setData: vi.fn(), applyOptions: vi.fn() }

  return {
    lineSeries,
    createChart: vi.fn(() => ({
      addSeries: vi.fn(() => lineSeries),
      applyOptions: vi.fn(),
      timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
      remove: vi.fn(),
    })),
  }
})

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  LineSeries: 'LineSeries',
}))

function completedBacktest(overrides: Partial<{
  totalReturnRate: number
  winRate: number | null
  positionOpenCount: number
  closedTrades: ClosedTrade[]
  contractFigures: ContractBacktestFigures | null
  split: { inSample: Backtest, validation: Backtest } | null
}> = {}): Backtest {
  const closedTrades = overrides.closedTrades ?? [new ClosedTrade(
    'long', RUN_START, new Decimal('100'), RUN_END, new Decimal('110'),
    new Decimal('10000'), new Decimal('1000'), 'signal', new Decimal(0), new Decimal(0))]

  return new Backtest(
    'BTCUSDT', '1h', RUN_START, RUN_END, 3,
    new Decimal('10000'), new Decimal('12500'),
    overrides.totalReturnRate ?? 0.25, 0.1,
    overrides.winRate === undefined ? 0.75 : overrides.winRate,
    overrides.positionOpenCount ?? closedTrades.length,
    0, 0, 0, new Decimal(0),
    closedTrades,
    [new EquityPoint(RUN_START, new Decimal('10000')), new EquityPoint(RUN_END, new Decimal('12500'))],
    overrides.contractFigures ?? null,
    new BacktestTradeStatistics(2.5, new Decimal(75), 9000, 1, 0.25),
    'nextOpen',
    overrides.split ? new Date('2026-08-21T00:00:00Z') : null,
    overrides.split?.inSample ?? null,
    overrides.split?.validation ?? null)
}

function detailOf(run: Parameters<typeof buildBacktestRun>[0]) {
  return buildBacktestRun(run).toDomain().toDetailDto()
}

function mountDialog(
  props: Partial<InstanceType<typeof BacktestRunDetailDialog>['$props']> = {},
  stubs: Record<string, boolean> = {},
) {
  return mount(BacktestRunDetailDialog, {
    props: {
      open: true,
      detail: null,
      loading: false,
      failureMessage: null,
      timeZone: buildTimeZone(),
      ...props,
    },
    global: { stubs },
  })
}

describe('BacktestRunDetailDialog 完成的那一筆', () => {
  it('成績單、資金曲線與交易明細同時在畫面上', () => {
    const wrapper = mountDialog({ detail: detailOf({ status: 'succeeded', result: completedBacktest() }) })

    expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="equity-curve-chart"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="trade-row"]')).toHaveLength(1)
  })

  it.each([
    { totalReturnRate: 0.25, text: '+25.00%', tone: '--positive' },
    { totalReturnRate: -0.08, text: '-8.00%', tone: '--negative' },
  ])('總報酬率 $text 用它自己的顏色', ({ totalReturnRate, text, tone }) => {
    const wrapper = mountDialog({
      detail: detailOf({ status: 'succeeded', result: completedBacktest({ totalReturnRate }) }),
    })

    const cell = wrapper.get('[data-testid="summary-total-return-rate"]')
    expect(cell.text()).toBe(text)
    expect(cell.classes().some(name => name.endsWith(tone))).toBe(true)
  })

  it('賺的那一筆交易綠、賠的那一筆紅', () => {
    const wrapper = mountDialog({
      detail: detailOf({
        status: 'succeeded',
        result: completedBacktest({
          closedTrades: [
            new ClosedTrade('long', RUN_START, new Decimal('100'), RUN_END, new Decimal('110'),
              new Decimal('10000'), new Decimal('300'), 'signal', new Decimal(0), new Decimal(0)),
            new ClosedTrade('short', RUN_START, new Decimal('100'), RUN_END, new Decimal('110'),
              new Decimal('10000'), new Decimal('-120'), 'signal', new Decimal(0), new Decimal(0)),
          ],
        }),
      }),
    })

    const profits = wrapper.findAll('[data-testid="trade-profit"]')
    expect(profits[0]!.text()).toBe('300.00')
    expect(profits[0]!.classes().some(name => name.endsWith('--positive'))).toBe(true)
    expect(profits[1]!.text()).toBe('-120.00')
    expect(profits[1]!.classes().some(name => name.endsWith('--negative'))).toBe(true)
  })

  it('一筆都沒平倉時勝率說不適用，也明講沒有交易', () => {
    const wrapper = mountDialog({
      detail: detailOf({ status: 'succeeded', result: completedBacktest({ winRate: null, closedTrades: [] }) }),
    })

    expect(wrapper.get('[data-testid="summary-win-rate"]').text()).toBe('不適用')
    expect(wrapper.get('[data-testid="no-trades"]').text()).toContain('這段期間沒有觸發任何交易')
  })

  it('每一棒都說買入時，說得出那一注還開著', () => {
    const wrapper = mountDialog({
      detail: detailOf({
        status: 'succeeded',
        result: completedBacktest({ winRate: null, positionOpenCount: 1, closedTrades: [] }),
      }),
    })

    expect(wrapper.get('[data-testid="summary-position-open-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="no-closed-trades-yet"]').text()).toContain('開了倉但還沒平掉')
  })

  it('資金曲線的每一點都交給繪圖函式庫，順序不變', async () => {
    mountDialog({ detail: detailOf({ status: 'succeeded', result: completedBacktest() }) })
    await flushPromises()

    const drawn = chartLibrary.lineSeries.setData.mock.calls.at(-1)?.[0] as { value: number }[] | undefined
    expect(drawn).toHaveLength(2)
    expect(drawn![0]!.value).toBe(10000)
    expect(drawn![1]!.value).toBe(12500)
  })

  it('有驗證起點時由上而下是驗證段、調參段、整段', () => {
    // 三張圖同時載入繪圖函式庫會繞過替身；這裡要驗的是分段，圖本身由上面那幾條驗。
    const wrapper = mountDialog({
      detail: detailOf({
        status: 'succeeded',
        result: completedBacktest({ split: { inSample: completedBacktest(), validation: completedBacktest() } }),
      }),
    }, { BacktestEquityCurveChart: true })

    const kinds = wrapper.findAll('section[data-testid^="backtest-result-section-"]')
      .map(section => section.attributes('data-testid'))
    expect(kinds).toEqual([
      'backtest-result-section-validation', 'backtest-result-section-inSample', 'backtest-result-section-whole',
    ])
  })

  it('成績單寫出五格與成交時點', () => {
    const wrapper = mountDialog({ detail: detailOf({ status: 'succeeded', result: completedBacktest() }) })

    expect(wrapper.get('[data-testid="summary-profit-factor"]').text()).toBe('2.50')
    expect(wrapper.get('[data-testid="summary-fill-timing"]').text()).toBe('下一格開盤成交')
  })

  it('合約的成績單與明細說出合約帳戶的事', () => {
    const wrapper = mountDialog({
      detail: detailOf({
        kind: 'contractScript',
        status: 'succeeded',
        leverage: new Decimal(5),
        tradingMode: 'shortOnly',
        result: completedBacktest({
          closedTrades: [new ClosedTrade(
            'short', RUN_START, new Decimal(100), RUN_END, new Decimal('119.5'),
            new Decimal(10000), new Decimal(-10000), 'liquidation', new Decimal(0), new Decimal(0),
            new ContractTradeFigures(new Decimal(5), new Decimal(500), new Decimal(5)))],
          contractFigures: new ContractBacktestFigures(
            'shortOnly', new Decimal(5), 1, new Decimal(18), 0, null, 1, 0, 0,
            'tiers', new Date('2026-09-01T00:00:00Z')),
        }),
      }),
    })

    expect(wrapper.get('[data-testid="summary-contract-trading-mode"]').text()).toBe('只做空')
    expect(wrapper.get('[data-testid="summary-liquidation-exit-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="summary-total-funding-fee"]').text()).toBe('付出 18.00')
    expect(wrapper.get('[data-testid="summary-long-trades"]').text()).toContain('不適用')
    expect(wrapper.get('[data-testid="summary-maintenance-margin-basis"]').text()).toContain('完整分級')
    expect(wrapper.get('[data-testid="trade-exit-reason"]').text()).toBe('強平')
    expect(wrapper.get('[data-testid="trade-leverage"]').text()).toBe('5 倍')
    expect(wrapper.get('[data-testid="trade-margin"]').text()).toBe('10000.00')
    expect(wrapper.text()).toContain('BTCUSDT · 一小時 · 5x · 只做空')
  })
})

describe('BacktestRunDetailDialog 沒完成的那一筆', () => {
  it('失敗的只說原因，沒有成績單', () => {
    const wrapper = mountDialog({ detail: detailOf({ status: 'failed', failureReason: '超過時間上限' }) })

    expect(wrapper.get('[data-testid="backtest-run-detail-outcome"]').text()).toBe('失敗：超過時間上限')
    expect(wrapper.find('[data-testid="summary-total-return-rate"]').exists()).toBe(false)
  })

  it('已取消的說已取消', () => {
    const wrapper = mountDialog({ detail: detailOf({ status: 'cancelled' }) })

    expect(wrapper.get('[data-testid="backtest-run-detail-outcome"]').text()).toBe('已取消')
  })

  it('還在跑的說它現在沒有成績單', () => {
    const wrapper = mountDialog({ detail: detailOf({ status: 'running', progressPercent: 40 }) })

    expect(wrapper.get('[data-testid="backtest-run-status"]').text()).toBe('進行中 · 40%')
    expect(wrapper.get('[data-testid="backtest-run-detail-no-result"]').text()).toBe('這一筆沒有成績單。')
  })

  it('讀不到時說原因', () => {
    const wrapper = mountDialog({ failureMessage: new LocalizedTextVo('找不到', 'Not found') })

    expect(wrapper.get('[data-testid="backtest-run-detail-failure"]').text()).toBe('找不到')
  })

  it('標題寫著是哪一筆', () => {
    const wrapper = mountDialog({ detail: detailOf({ id: 40, status: 'cancelled' }) })

    expect(wrapper.text()).toContain('回測 #40')
  })
})
