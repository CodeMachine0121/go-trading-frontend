import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BacktestEquityCurveChart from '~/components/molecules/BacktestEquityCurveChart.vue'
import { EquityPointDto } from '~/domain/models/dto/equity-point-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

// 繪圖函式庫是最外層的邊界：它需要真正的畫布，而這裡要驗的不是它畫得對不對，
// 是我們餵給它的東西對不對。
const chartLibrary = vi.hoisted(() => {
  const lineSeries = { setData: vi.fn() }

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

const FIRST_MOMENT = new Date('2026-09-01T04:00:00Z')

function equityCurve(): EquityPointDto[] {
  return [
    new EquityPointDto(FIRST_MOMENT, new Decimal('10000.5')),
    new EquityPointDto(new Date('2026-09-02T04:00:00Z'), new Decimal('12500')),
  ]
}

async function mountChart(timeZoneIdentifier = 'UTC') {
  chartLibrary.lineSeries.setData.mockClear()
  const wrapper = mount(BacktestEquityCurveChart, {
    props: { equityCurve: equityCurve(), timeZone: buildTimeZone(timeZoneIdentifier) },
  })
  await flushPromises()

  return wrapper
}

function drawnRows(): { time: number, value: number }[] {
  return chartLibrary.lineSeries.setData.mock.calls.at(-1)?.[0] ?? []
}

describe('BacktestEquityCurveChart', () => {
  it('每一點都交給繪圖函式庫，順序不變', async () => {
    await mountChart()

    expect(drawnRows()).toHaveLength(2)
    expect(drawnRows()[0]!.value).toBe(10000.5)
    expect(drawnRows()[1]!.value).toBe(12500)
  })

  it('交給繪圖函式庫的是選定時區的當地時鐘讀數，不是那個瞬間', async () => {
    // 它是看自己收到的時間的世界標準時間年月日在分格的。餵真正的瞬間進去，
    // 分格與標籤就會落在世界標準時間的午夜上，而不是使用者所在地的午夜。
    await mountChart('Asia/Taipei')

    // 台北的 04:00Z 讀作 12:00，所以送進去的是 12:00Z 的秒數。
    expect(drawnRows()[0]!.time).toBe(new Date('2026-09-01T12:00:00Z').getTime() / 1000)
  })

  it('世界標準時間下讀數就是那個瞬間本身', async () => {
    await mountChart('UTC')

    expect(drawnRows()[0]!.time).toBe(FIRST_MOMENT.getTime() / 1000)
  })
})
