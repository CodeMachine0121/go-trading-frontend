import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ContractTradeRMultipleChart from '~/components/molecules/ContractTradeRMultipleChart.vue'
import { ContractTradeChartPointDto } from '~/domain/models/dto/contract-trade-chart-point-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

const chartLibrary = vi.hoisted(() => {
  const lineSeries = { setData: vi.fn(), applyOptions: vi.fn() }
  const chart = {
    addSeries: vi.fn(() => lineSeries),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  }

  return { lineSeries, chart, createChart: vi.fn(() => chart) }
})

vi.mock('lightweight-charts', () => ({ createChart: chartLibrary.createChart, LineSeries: 'LineSeries' }))

const SAME_MOMENT = new Date('2026-09-01T00:00:00Z')

async function mountChart(points: ContractTradeChartPointDto[]) {
  vi.clearAllMocks()
  const wrapper = mount(ContractTradeRMultipleChart, { props: { points, timeZone: buildTimeZone('UTC') } })
  await flushPromises()

  return wrapper
}

describe('ContractTradeRMultipleChart', () => {
  it('依平倉時間畫累積 R；同一刻平倉的往後挪一秒讓時間嚴格遞增', async () => {
    await mountChart([new ContractTradeChartPointDto(SAME_MOMENT, 1.5), new ContractTradeChartPointDto(SAME_MOMENT, 0.5)])

    const seconds = SAME_MOMENT.getTime() / 1000
    expect(chartLibrary.lineSeries.setData.mock.calls.at(-1)?.[0]).toEqual([
      { time: seconds, value: 1.5 },
      { time: seconds + 1, value: 0.5 },
    ])
  })

  it('換一份資料就重畫；外觀換了重新上色；離開時收掉', async () => {
    const wrapper = await mountChart([])

    await wrapper.setProps({ points: [new ContractTradeChartPointDto(SAME_MOMENT, 2)] })
    document.documentElement.dataset.theme = 'light'
    await flushPromises()
    wrapper.unmount()

    expect(chartLibrary.lineSeries.setData.mock.calls.at(-1)?.[0]).toHaveLength(1)
    expect(chartLibrary.lineSeries.applyOptions).toHaveBeenCalled()
    expect(chartLibrary.chart.remove).toHaveBeenCalled()
    delete document.documentElement.dataset.theme
  })

  it('圖表還沒建好時換外觀不會出錯', async () => {
    vi.clearAllMocks()
    mount(ContractTradeRMultipleChart, { props: { points: [], timeZone: buildTimeZone('UTC') } })

    document.documentElement.dataset.theme = 'light'
    await flushPromises()

    expect(chartLibrary.createChart).toHaveBeenCalled()
    delete document.documentElement.dataset.theme
  })

  it('時間標籤以當地讀數顯示；載完前離開不建立圖表', async () => {
    await mountChart([])
    const options = chartLibrary.createChart.mock.calls[0] as unknown as [HTMLElement, { localization: { timeFormatter: (time: number) => string } }]
    expect(options[1].localization.timeFormatter(SAME_MOMENT.getTime() / 1000)).toBe('2026-09-01 00:00')

    vi.clearAllMocks()
    const wrapper = mount(ContractTradeRMultipleChart, { props: { points: [], timeZone: buildTimeZone('UTC') } })
    wrapper.unmount()
    await flushPromises()
    expect(chartLibrary.createChart).not.toHaveBeenCalled()
  })
})
