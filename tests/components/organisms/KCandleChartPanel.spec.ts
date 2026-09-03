import Decimal from 'decimal.js'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildTimeZone } from '../../fixtures/time-zone'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
// 圖本身以 stub 取代：它要的是真正的畫布，而它畫得對不對是它自己的測試在管。
const CURRENT_TIME = new Date('2026-09-02T12:00:00.000Z')

function buildKCandle(openTime: string, closePrice: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

function buildProxy(overrides: Partial<IKCandleProxy> = {}): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn().mockResolvedValue([buildKCandle('2026-09-02T10:00:00.000Z', '110')]),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    ...overrides,
  }
}

async function mountPanel(kCandleProxy: IKCandleProxy) {
  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(kCandleProxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      timeZone: buildTimeZone(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleChartPanel', () => {
  it('進入畫面就以最近一天取一次行情，並標示每根涵蓋多久', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    const loadPlan = findKCandleSeries.mock.calls[0]?.[0]
    expect(loadPlan.symbol).toBe('BTCUSDT')
    expect(loadPlan.interval.value).toBe('5m')
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('五分鐘')
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it('列出快捷區間，目前選中的那一個看得出來', async () => {
    const wrapper = await mountPanel(buildProxy())

    const presetButtons = wrapper.findAll('[data-testid="range-preset-button"]')
    expect(presetButtons.map(button => button.text()))
      .toEqual(['一天', '五天', '一個月', '三個月', '六個月', '一年'])
    expect(presetButtons[0]?.classes()).toContain('app-button--primary')
  })

  it('選一個月就以較粗的刻度重新取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue([])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    await wrapper.findAll('[data-testid="range-preset-button"]')[2]?.trigger('click')
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(2)
    expect(findKCandleSeries.mock.calls[1]?.[0].interval.value).toBe('4h')
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('四小時')
  })

  it('不必重新取時，仍然把該看的那一段交給圖——按快捷區間不會像壞掉', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    // 先縮到一個仍在已取回範圍內的小段，再按回「一天」
    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-02T10:00:00.000Z'),
      endTime: new Date('2026-09-02T11:00:00.000Z'),
    })
    await flushPromises()
    await wrapper.findAll('[data-testid="range-preset-button"]')[0]?.trigger('click')
    await flushPromises()

    // 資料確實不必換
    expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    // 但圖一定要被告知回到那一整天
    expect(wrapper.findComponent(KCandleChart).props('visibleStartTime'))
      .toEqual(new Date('2026-09-01T12:00:00.000Z'))
    expect(wrapper.findComponent(KCandleChart).props('visibleEndTime'))
      .toEqual(new Date('2026-09-02T12:00:00.000Z'))
    expect(wrapper.findAll('[data-testid="range-preset-button"]')[0]?.classes())
      .toContain('app-button--primary')
  })

  it('拉得太遠時，交給圖的是被收回四百天之後的那一段', async () => {
    const wrapper = await mountPanel(buildProxy())

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2025-04-20T12:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    await flushPromises()

    // 問的是五百天，該看的被收回四百天，結束的那一端不變
    expect(wrapper.findComponent(KCandleChart).props('visibleStartTime'))
      .toEqual(new Date('2025-07-29T12:00:00.000Z'))
    expect(wrapper.findComponent(KCandleChart).props('visibleEndTime'))
      .toEqual(new Date('2026-09-02T12:00:00.000Z'))
  })

  it('使用者在圖上拉出仍落在手上這批之內的一段時，不再去取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-02T09:00:00.000Z'),
      endTime: new Date('2026-09-02T11:00:00.000Z'),
    })
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it('使用者拉出手上這批之外的一段時，重新取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-10T09:00:00.000Z'),
      endTime: new Date('2026-09-10T11:00:00.000Z'),
    })
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(2)
  })

  it('換交易標的就重新取，正在看的那一段不變', async () => {
    const findKCandleSeries = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue([])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    const firstPlan = findKCandleSeries.mock.calls[0]?.[0]

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(2)
    const secondPlan = findKCandleSeries.mock.calls[1]?.[0]
    expect(secondPlan.symbol).toBe('ETHUSDT')
    expect(secondPlan.startTime).toEqual(firstPlan.startTime)
    expect(secondPlan.endTime).toEqual(firstPlan.endTime)
  })

  it('換畫法不重新取，只改怎麼畫', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    await wrapper.findAll('[data-testid="drawing-button"]')[1]?.trigger('click')
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(KCandleChart).props('drawing')).toBe('line')
  })

  it('未指定交易標的時不去取，並把原因標在欄位旁', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue([])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    // 選單挑不出空值，但欄位的契約仍然是「交出什麼，這裡就用什麼」——
    // 直接讓欄位交出一個空的標的，驗畫面確實把原因標回欄位旁。
    wrapper.findComponent(SymbolField).vm.$emit('update:modelValue', '   ')
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請指定交易標的')
  })

  it('這段區間內沒有任何 K 線時說「查無 K 線」，不畫空白的圖', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn().mockResolvedValue([]),
    }))

    expect(wrapper.get('[data-testid="empty-chart"]').text()).toContain('查無 K 線')
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
  })

  it('有資料時說明手上這批有幾根、涵蓋哪一段', async () => {
    const wrapper = await mountPanel(buildProxy())

    expect(wrapper.get('[data-testid="covered-range"]').text())
      .toBe('手上這批共 1 根，涵蓋 2026-09-01 00:00 ～ 2026-09-03 00:00（世界標準時間）')
  })

  it('換時區時，涵蓋的那一段改用新時區說，且不重新取', async () => {
    const findKCandleSeries = vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    await wrapper.setProps({ timeZone: buildTimeZone('Asia/Taipei') })

    expect(wrapper.get('[data-testid="covered-range"]').text())
      .toBe('手上這批共 1 根，涵蓋 2026-09-01 08:00 ～ 2026-09-03 08:00（台北）')
    expect(findKCandleSeries).toHaveBeenCalledTimes(1)
  })

  it('取資料進行中時呈現載入中，取回之後就收起來', async () => {
    let releaseRequest: () => void = () => {}
    const pendingRequest = new Promise<KCandle[]>((resolve) => {
      releaseRequest = () => resolve([buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    })
    const wrapper = mount(KCandleChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(
          buildProxy({ findKCandleSeries: vi.fn().mockImplementation(() => pendingRequest) }))),
        tradingSymbolApplication: buildTradingSymbolApplication(),
        timeZone: buildTimeZone(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await nextTick()

    expect(wrapper.get('[data-testid="loading-alert"]').text()).toContain('取行情中')

    releaseRequest()
    await flushPromises()

    expect(wrapper.find('[data-testid="loading-alert"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it('被系統拒絕時如實轉達原因', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn().mockRejectedValue(
        new BackendRequestRejectedError('時間區間過大，請縮小區間或改用更長的彙總刻度')),
    }))

    expect(wrapper.get('[data-testid="rejected-alert"]').text())
      .toContain('時間區間過大，請縮小區間或改用更長的彙總刻度')
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('—')
    expect(wrapper.find('[data-testid="covered-range"]').exists()).toBe(false)
  })

  it('後端自己壞掉時，說的是後端出錯而不是你的條件有問題', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn().mockRejectedValue(new BackendServerError('讀取 K 線失敗')),
    }))

    expect(wrapper.get('[data-testid="server-error-alert"]').text()).toContain('後端出錯了')
  })

  it('連不上後端時告知並提供重試', async () => {
    const findKCandleSeries = vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles/series'))
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    expect(wrapper.get('[data-testid="unreachable-alert"]').text()).toContain('連不上後端')

    await wrapper.get('[data-testid="unreachable-alert"] button').trigger('click')
    await flushPromises()

    expect(findKCandleSeries).toHaveBeenCalledTimes(2)
  })

  it('前一次失敗、這一次成功時，先前的錯誤訊息消失', async () => {
    const findKCandleSeries = vi.fn()
      .mockRejectedValueOnce(new BackendUnreachableError('/k-candles/series'))
      .mockResolvedValue([buildKCandle('2026-09-02T10:00:00.000Z', '110')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))

    await wrapper.get('[data-testid="unreachable-alert"] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it('沒認出來的失敗一樣要說一聲，不留白', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandleSeries: vi.fn().mockRejectedValue(new Error('something odd')),
    }))

    expect(wrapper.get('[data-testid="rejected-alert"]').text()).toContain('取行情時發生未預期的錯誤')
  })

  it('慢回來的那一次失敗時，不蓋掉已經畫好的圖', async () => {
    let failSlowRequest: () => void = () => {}
    const slowRequest = new Promise<KCandle[]>((_resolve, reject) => {
      failSlowRequest = () => reject(new BackendUnreachableError('/k-candles/series'))
    })
    const findKCandleSeries = vi.fn()
      .mockResolvedValueOnce([buildKCandle('2026-09-02T10:00:00.000Z', '110')])
      .mockImplementationOnce(() => slowRequest)
      .mockResolvedValue([buildKCandle('2026-09-02T10:00:00.000Z', '222')])
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    const chartComponent = wrapper.findComponent(KCandleChart)

    chartComponent.vm.$emit('rangeChange', {
      startTime: new Date('2025-09-02T12:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    await flushPromises()
    chartComponent.vm.$emit('rangeChange', {
      startTime: new Date('2026-08-28T12:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    await flushPromises()
    failSlowRequest()
    await flushPromises()

    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('一小時')
  })

  it('慢回來的那一次不覆蓋後送出的結果', async () => {
    const slowSeries = [buildKCandle('2026-09-02T00:00:00.000Z', '111')]
    const fastSeries = [buildKCandle('2026-09-02T10:00:00.000Z', '222')]
    let releaseSlowRequest: () => void = () => {}
    const slowRequest = new Promise<KCandle[]>((resolve) => {
      releaseSlowRequest = () => resolve(slowSeries)
    })
    const findKCandleSeries = vi.fn()
      .mockResolvedValueOnce([buildKCandle('2026-09-02T10:00:00.000Z', '110')])
      .mockImplementationOnce(() => slowRequest)
      .mockResolvedValue(fastSeries)
    const wrapper = await mountPanel(buildProxy({ findKCandleSeries }))
    const chartComponent = wrapper.findComponent(KCandleChart)

    // 先拉出一段會慢慢回來的（一年），還沒回來就再拉出一段立刻回來的（五天）
    chartComponent.vm.$emit('rangeChange', {
      startTime: new Date('2025-09-02T12:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    await flushPromises()
    chartComponent.vm.$emit('rangeChange', {
      startTime: new Date('2026-08-28T12:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    await flushPromises()
    releaseSlowRequest()
    await flushPromises()

    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('一小時')
  })
})
