import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { seriesOf } from '../../fixtures/k-candle-series'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildLiveKCandleApplication } from '../../fixtures/live-k-candle-application'
import { buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { buildTimeZone } from '../../fixtures/time-zone'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-09-02T12:00:00.000Z')
const INTERVAL_SELECT = '[data-testid="aggregation-interval-choice-select"]'

function buildKCandle(): KCandle {
  return new KCandle(
    'BTCUSDT', new Date('2026-09-02T10:00:00.000Z'),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('110'),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

function buildProxy(overrides: Partial<IKCandleProxy> = {}): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([buildKCandle()])),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

async function mountPanel(
  kCandleProxy: IKCandleProxy,
  calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])])),
  tradingSymbolApplication = buildTradingSymbolApplication(),
) {
  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(kCandleProxy)),
      tradingSymbolApplication,
      liveKCandleApplication: buildLiveKCandleApplication(),
      chartIndicatorApplication: buildChartIndicatorApplication({ calculateIndicator }),
      strategyApplication: buildStrategyApplication({
        listStrategies: vi.fn().mockResolvedValue(
          [buildStoredStrategy(7, '二十根均線', { resultType: 'float' })]),
      }),
      timeZone: buildTimeZone(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return wrapper
}

/**
 * 等使用者「停手」。指標重算不在顯示區間變動的當下發生——
 * 拖動一次會產生幾十個中間狀態，每一個都算等於把同一份工作做幾十遍。
 */
async function settle() {
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

/** 目前選著的是哪一種粗細。 */
function chosenCoarseness(wrapper: VueWrapper): string {
  return (wrapper.find(INTERVAL_SELECT).element as HTMLSelectElement).value
}

/** 挑一種粗細，並等到那一次取行情跑完。 */
async function chooseCoarseness(wrapper: VueWrapper, value: string) {
  await wrapper.find(INTERVAL_SELECT).setValue(value)
  await flushPromises()
}

/** 最後一次交給後端的條件裡說出了哪一種粗細。 */
function declaredIntervalOfLastCall(findKCandleSeries: ReturnType<typeof vi.fn>): string | null {
  return findKCandleSeries.mock.calls.at(-1)?.[0].aggregationIntervalChoice.declaredInterval
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('在圖表上挑一根 K 線涵蓋多久', () => {
  it('選單上列的是領域說的那五項，畫面不自己寫死一份', async () => {
    const wrapper = await mountPanel(buildProxy())

    expect(wrapper.find(INTERVAL_SELECT).findAll('option').map(option => option.text()))
      .toEqual(['自動', '一分鐘', '五分鐘', '十五分鐘', '一小時'])
  })

  it('一進畫面選著「自動」，取行情時什麼粗細都不說', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()]))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    expect((wrapper.find(INTERVAL_SELECT).element as HTMLSelectElement).value).toBe('auto')
    expect(declaredIntervalOfLastCall(findKCandleSeries)).toBeNull()
  })

  it('挑一種粗細就重新取，並把那一種說出去', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '5m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    await chooseCoarseness(wrapper, '5m')

    expect(findKCandleSeries).toHaveBeenCalledTimes(2)
    expect(declaredIntervalOfLastCall(findKCandleSeries)).toBe('5m')
  })

  it('挑回「自動」就不再說粗細', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '5m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '5m')

    await chooseCoarseness(wrapper, 'auto')

    expect(findKCandleSeries).toHaveBeenCalledTimes(3)
    expect(declaredIntervalOfLastCall(findKCandleSeries)).toBeNull()
  })

  it('挑到同一個不重新取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '5m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '5m')

    await chooseCoarseness(wrapper, '5m')

    expect(findKCandleSeries).toHaveBeenCalledTimes(2)
  })

  it('標題列說的是系統實際用的那一種，不是使用者挑的那一種', async () => {
    // 要了一分鐘，系統給十五分鐘——看得出來比信任可靠。
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '15m')),
    }))

    await chooseCoarseness(wrapper, '1m')

    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('十五分鐘')
  })

  it('換一種粗細時看的那一段不變', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '5m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    const before = findKCandleSeries.mock.calls.at(-1)?.[0]

    await chooseCoarseness(wrapper, '1h')

    const after = findKCandleSeries.mock.calls.at(-1)?.[0]
    expect(after.visibleStartTime).toEqual(before.visibleStartTime)
    expect(after.visibleEndTime).toEqual(before.visibleEndTime)
  })

  it('按快捷區間不改變挑好的那一種', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '15m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '15m')

    await wrapper.findAll('[data-testid="range-preset-button"]')[5]?.trigger('click')
    await flushPromises()

    expect((wrapper.find(INTERVAL_SELECT).element as HTMLSelectElement).value).toBe('15m')
    expect(declaredIntervalOfLastCall(findKCandleSeries)).toBe('15m')
  })

  it('換交易標的不改變挑好的那一種', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '15m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '15m')

    await wrapper.findComponent({ name: 'SymbolField' }).vm.$emit('update:modelValue', 'ETHUSDT')
    await flushPromises()

    expect((wrapper.find(INTERVAL_SELECT).element as HTMLSelectElement).value).toBe('15m')
    expect(declaredIntervalOfLastCall(findKCandleSeries)).toBe('15m')
  })

  it('換一種粗細時，圖上已套用的指標跟著重算', async () => {
    const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
      'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])]))
    // 系統照挑的做，所以第二次回來的是另一種粗細——那才是「圖上換了一批」。
    const wrapper = await mountPanel(
      buildProxy({
        findKCandleSeries: vi.fn()
          .mockResolvedValueOnce(seriesOf([buildKCandle()], '5m'))
          .mockResolvedValue(seriesOf([buildKCandle()], '1h')),
      }),
      calculateIndicator)
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    const calculationsBefore = calculateIndicator.mock.calls.length

    await chooseCoarseness(wrapper, '1h')
    await settle()

    // 圖上換了一批 K 線，線就得照那一批重畫——不重算的話它畫的是另一種粗細的答案。
    expect(calculateIndicator.mock.calls.length).toBeGreaterThan(calculationsBefore)
  })

  it('補齊之後指標也要重算——補回來的那幾根落在同一段、同一種粗細裡', async () => {
    // 補齊填的是涵蓋範圍**之內**的洞：交易標的、粗細、看的那一段全都沒變，
    // 只有那批 K 線多了幾根。靠比對欄位是看不出來的，靠「有沒有換一批」才看得出來。
    const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
      'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])]))
    const wrapper = await mountPanel(
      buildProxy({ catchUpSymbol: vi.fn().mockResolvedValue(3) }),
      calculateIndicator,
      buildTradingSymbolApplication(['BTCUSDT'], { hasTradingSession: true }))
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    const calculationsBefore = calculateIndicator.mock.calls.length

    await wrapper.get('[data-testid="catch-up-button"]').trigger('click')
    await flushPromises()
    await settle()

    expect(calculateIndicator.mock.calls.length).toBeGreaterThan(calculationsBefore)
  })

  it('在圖上拉遠不改變挑好的那一種', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '15m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '15m')

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-08-03T12:00:00.000Z'),
      endTime: CURRENT_TIME,
    })
    await flushPromises()

    expect(chosenCoarseness(wrapper)).toBe('15m')
    expect(declaredIntervalOfLastCall(findKCandleSeries)).toBe('15m')
  })

  it('換一種畫法不改變挑好的那一種，也不重新取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()], '15m'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '15m')
    const callsBefore = findKCandleSeries.mock.calls.length

    await wrapper.findAll('[data-testid="drawing-button"]')[1]?.trigger('click')
    await flushPromises()

    expect(chosenCoarseness(wrapper)).toBe('15m')
    expect(findKCandleSeries).toHaveBeenCalledTimes(callsBefore)
  })

  it('還沒指定交易標的時，挑一種粗細也不去取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([buildKCandle()]))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    wrapper.findComponent(SymbolField).vm.$emit('update:modelValue', '')
    await flushPromises()
    const callsBefore = findKCandleSeries.mock.calls.length

    await chooseCoarseness(wrapper, '5m')

    expect(findKCandleSeries).toHaveBeenCalledTimes(callsBefore)
  })

  it('挑得太細而那一段太長時，把系統說的原因原樣轉達', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn()
        .mockResolvedValueOnce(seriesOf([buildKCandle()]))
        .mockRejectedValue(new BackendRequestRejectedError(
          '時間區間過大，請縮小區間；若指定了彙總刻度，也可以改用更長的一種（單次最多 1000 根）')),
    }))

    await chooseCoarseness(wrapper, '1m')

    // 那句話同時說出兩條出路，畫面一個字都不改寫。
    expect(wrapper.get('[data-testid="rejected-alert"]').text())
      .toContain('也可以改用更長的一種')
  })

  it('改看短一點的一段之後，那句拒絕也會消失', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn()
        .mockResolvedValueOnce(seriesOf([buildKCandle()]))
        .mockRejectedValueOnce(new BackendRequestRejectedError('時間區間過大'))
        .mockResolvedValue(seriesOf([buildKCandle()], '1m')),
    }))
    await chooseCoarseness(wrapper, '1m')

    // 系統說的兩條出路都要走得通：這是「縮小區間」那一條。
    await wrapper.findAll('[data-testid="range-preset-button"]')[0]?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
    expect(chosenCoarseness(wrapper)).toBe('1m')
  })

  it('被拒絕之後改用更粗的一種，重試的是他要求的那一段，不是上一次成功的那一段', async () => {
    const findKCandleSeries = vi.fn()
      .mockResolvedValueOnce(seriesOf([buildKCandle()]))
      .mockResolvedValueOnce(seriesOf([buildKCandle()], '1m'))
      .mockRejectedValueOnce(new BackendRequestRejectedError('時間區間過大'))
      .mockResolvedValue(seriesOf([buildKCandle()], '1h'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    await chooseCoarseness(wrapper, '1m')

    // 按「一年」被拒絕，然後改用更粗的一種救回來——這正是規格寫的那條出路。
    await wrapper.findAll('[data-testid="range-preset-button"]')[8]?.trigger('click')
    await flushPromises()
    await chooseCoarseness(wrapper, '1h')

    const recovery = findKCandleSeries.mock.calls.at(-1)?.[0]
    const visibleDays = (recovery.visibleEndTime.getTime() - recovery.visibleStartTime.getTime())
      / (24 * 60 * 60 * 1000)
    expect(visibleDays).toBe(365)
  })

  it('改用更粗的一種之後，那句拒絕就消失', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn()
        .mockResolvedValueOnce(seriesOf([buildKCandle()]))
        .mockRejectedValueOnce(new BackendRequestRejectedError('時間區間過大'))
        .mockResolvedValue(seriesOf([buildKCandle()], '1h')),
    }))
    await chooseCoarseness(wrapper, '1m')

    await chooseCoarseness(wrapper, '1h')

    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('一小時')
  })
})
