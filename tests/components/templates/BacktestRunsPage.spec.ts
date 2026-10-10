import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BacktestRunsPage from '~/components/templates/BacktestRunsPage.vue'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import type { BacktestRunListQueryDomain } from '~/domain/models/domains/backtest-run-list-query-domain'
import { BacktestRunPage } from '~/domain/models/entities/backtest-run'
import Decimal from 'decimal.js'
import { Backtest, BacktestTradeStatistics, EquityPoint } from '~/domain/models/entities/backtest'
import { buildBacktestProxy, buildBacktestRun, buildBacktestRunProxy } from '../../fixtures/backtest-run'
import { buildTimeZone } from '../../fixtures/time-zone'

vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn(), applyOptions: vi.fn() })),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
  LineSeries: 'LineSeries',
}))

const TOTAL_RUN_COUNT = 25

/** 二十五筆輪次，其中三筆失敗；後端照查詢的狀態與筆數給，新到舊。 */
function twentyFiveRunsProxy(): IBacktestRunProxy {
  const allRuns = Array.from({ length: TOTAL_RUN_COUNT }, (_, index) => buildBacktestRun({
    id: TOTAL_RUN_COUNT - index,
    status: index < 3 ? 'failed' : 'succeeded',
    failureReason: index < 3 ? '超過時間上限' : '',
  }))

  return buildBacktestRunProxy({
    listRuns: vi.fn(async (queryDomain: BacktestRunListQueryDomain) => {
      const matching = allRuns.filter(run => queryDomain.status === null || run.status === queryDomain.status)

      return new BacktestRunPage(matching.slice(0, queryDomain.limit), matching.length)
    }),
  })
}

async function mountPage(runProxy: IBacktestRunProxy) {
  const wrapper = mount(BacktestRunsPage, {
    props: {
      backtestApplication: new BacktestApplication(new BacktestService(buildBacktestProxy(), runProxy)),
      timeZone: buildTimeZone(),
    },
  })
  await flushPromises()

  return wrapper
}

describe('BacktestRunsPage', () => {
  it('打開就列最新的二十筆，寫出總數，翻得下去', async () => {
    const wrapper = await mountPage(twentyFiveRunsProxy())

    const rows = wrapper.findAll('[data-testid="backtest-run-row"]')
    expect(rows).toHaveLength(20)
    expect(rows[0]!.text()).toContain('#25')
    expect(wrapper.get('[data-testid="backtest-run-count"]').text()).toContain('25')
    expect(wrapper.find('[data-testid="backtest-run-show-more"]').exists()).toBe(true)
  })

  it('再顯示更多之後列出全部二十五筆，翻不下去了', async () => {
    const runProxy = twentyFiveRunsProxy()
    const wrapper = await mountPage(runProxy)

    await wrapper.get('[data-testid="backtest-run-show-more"]').trigger('click')
    await flushPromises()

    expect(vi.mocked(runProxy.listRuns).mock.calls.at(-1)![0].limit).toBe(40)
    expect(wrapper.findAll('[data-testid="backtest-run-row"]')).toHaveLength(25)
    expect(wrapper.find('[data-testid="backtest-run-show-more"]').exists()).toBe(false)
  })

  it('篩失敗就只列那三筆', async () => {
    const runProxy = twentyFiveRunsProxy()
    const wrapper = await mountPage(runProxy)

    await wrapper.get('[data-testid="backtest-run-status-filter"]').setValue('failed')
    await flushPromises()

    expect(vi.mocked(runProxy.listRuns).mock.calls.at(-1)![0].status).toBe('failed')
    const rows = wrapper.findAll('[data-testid="backtest-run-row"]')
    expect(rows).toHaveLength(3)
    expect(rows.every(row => row.get('[data-testid="backtest-run-status"]').text() === '失敗')).toBe(true)
  })

  it('一筆都沒有時引導去策略腳本或交易策略頁', async () => {
    const wrapper = await mountPage(buildBacktestRunProxy())

    expect(wrapper.get('[data-testid="backtest-run-list-empty"]').text())
      .toContain('還沒有回測，去策略腳本或交易策略頁送出一筆')
  })

  it('點一筆完成的就用成績單畫面呈現', async () => {
    const start = new Date('2026-08-06T00:00:00Z')
    const end = new Date('2026-09-04T23:00:00Z')
    const result = new Backtest(
      'BTCUSDT', '1h', start, end, 2, new Decimal(10000), new Decimal(12550), 0.255, 0.101, 0.5, 4,
      0, 0, 0, new Decimal(0), [], [new EquityPoint(start, new Decimal(10000))], null,
      new BacktestTradeStatistics(2.5, new Decimal(75), 9000, 1, 0.25), 'nextOpen', null, null, null)
    const runProxy = twentyFiveRunsProxy()
    vi.mocked(runProxy.getRun).mockResolvedValue(buildBacktestRun({ id: 25, status: 'succeeded', result }))
    const wrapper = await mountPage(runProxy)

    await wrapper.findAll('[data-testid="backtest-run-open"]')[0]!.trigger('click')
    await flushPromises()

    expect(runProxy.getRun).toHaveBeenCalledWith(25)
    expect(wrapper.find('section[data-testid="backtest-result-section-whole"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="summary-profit-factor"]').exists()).toBe(true)
  })
})
