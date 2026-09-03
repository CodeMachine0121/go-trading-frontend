import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import ChartIndicatorPanel from '~/components/molecules/ChartIndicatorPanel.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildTimeZone } from '../../fixtures/time-zone'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-09-02T12:00:00.000Z')

function buildKCandle(openTime: string, closePrice: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

function buildKCandleProxy(): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn().mockResolvedValue([buildKCandle('2026-09-02T10:00:00.000Z', '110')]),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
  }
}

function aCalculation(indicatorName = '均價') {
  return new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo(indicatorName, [115])])
}

async function mountPanel(overrides: {
  strategies?: ReturnType<typeof buildStoredStrategy>[]
  calculateIndicator?: IIndicatorCalculationProxy['calculateIndicator']
} = {}) {
  const strategies = overrides.strategies
    ?? [buildStoredStrategy(7, '二十根均線', { resultType: 'float' })]
  const calculateIndicator = overrides.calculateIndicator
    ?? vi.fn().mockResolvedValue(aCalculation())

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildKCandleProxy())),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      chartIndicatorApplication: buildChartIndicatorApplication({ calculateIndicator }),
      strategyApplication: buildStrategyApplication({
        listStrategies: vi.fn().mockResolvedValue(strategies),
      }),
      timeZone: buildTimeZone(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return { wrapper, calculateIndicator }
}

async function applyStrategy(wrapper: Awaited<ReturnType<typeof mountPanel>>['wrapper'], id: number) {
  await wrapper.get('[data-testid="chart-indicator-picker"]').setValue(String(id))
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('圖表上的指標：挑一支套上去', () => {
  it('挑一支就立刻算，不必再按任何按鈕', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await applyStrategy(wrapper, 7)

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(1)
  })

  it('算的是圖上正在畫的那批 K 線', async () => {
    // 少給任何一樣，算出來的都是另一段行情的指標，而它畫在圖上看起來完全正常。
    const { wrapper, calculateIndicator } = await mountPanel()

    await applyStrategy(wrapper, 7)

    expect(calculateIndicator).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'BTCUSDT',
      candleCount: 1,
      aggregationInterval: expect.objectContaining({ value: '5m' }),
    }))
  })

  it('畫出來的線交給圖表', async () => {
    const { wrapper } = await mountPanel()

    await applyStrategy(wrapper, 7)

    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(1)
  })

  it('可以同時疊兩支', async () => {
    const { wrapper } = await mountPanel({
      strategies: [
        buildStoredStrategy(7, '第一支', { resultType: 'float' }),
        buildStoredStrategy(8, '第二支', { resultType: 'float' }),
      ],
      calculateIndicator: vi.fn()
        .mockResolvedValueOnce(aCalculation('甲'))
        .mockResolvedValueOnce(aCalculation('乙')),
    })

    await applyStrategy(wrapper, 7)
    await applyStrategy(wrapper, 8)

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(2)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(2)
  })

  it('已經套用的那一支不再出現在可挑清單裡', async () => {
    const { wrapper } = await mountPanel()

    await applyStrategy(wrapper, 7)

    const options = wrapper.findAll('[data-testid="chart-indicator-picker"] option')
      .map(option => option.text())
    expect(options.some(option => option.includes('二十根均線'))).toBe(false)
  })

  it('是非類型的策略列得出來但挑不到', async () => {
    // 直接讓它消失會讓使用者以為策略不見了；挑了才失敗又太晚。
    const { wrapper } = await mountPanel({
      strategies: [buildStoredStrategy(9, '是非題', { resultType: 'bool' })],
    })

    const boolOption = wrapper.findAll('[data-testid="chart-indicator-picker"] option')
      .find(option => option.text().includes('是非題'))
    expect(boolOption?.attributes('disabled')).toBeDefined()
    expect(boolOption?.text()).toContain('畫不成線')
  })

  it('移除一支時只移除它，另一支照樣留在圖上', async () => {
    const { wrapper } = await mountPanel({
      strategies: [
        buildStoredStrategy(7, '要移除的', { resultType: 'float' }),
        buildStoredStrategy(8, '要留著的', { resultType: 'float' }),
      ],
    })
    await applyStrategy(wrapper, 7)
    await applyStrategy(wrapper, 8)

    await wrapper.get('[data-testid="remove-indicator-7"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="applied-indicator"]').text()).toContain('要留著的')
    const indicators = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicators.map(indicator => indicator.strategyId)).toEqual([8])
  })

  it('一支策略都還沒存過時明說，而不是留一個空選單', async () => {
    const { wrapper } = await mountPanel({ strategies: [] })

    expect(wrapper.get('[data-testid="chart-indicator-empty"]').text()).toContain('還沒有任何策略')
    expect(wrapper.find('[data-testid="chart-indicator-picker"]').exists()).toBe(false)
  })

  it('一支都沒套用時，交給圖表的線是空的', async () => {
    const { wrapper } = await mountPanel()

    expect(wrapper.findComponent(KCandleChart).props('indicators')).toEqual([])
  })
})

describe('圖表上的指標：什麼時候重算', () => {
  it('換交易標的就重算一次', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyStrategy(wrapper, 7)

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledTimes(2)
    expect(calculateIndicator).toHaveBeenLastCalledWith(
      expect.objectContaining({ symbol: 'ETHUSDT' }))
  })

  it('拉到需要重新取一批 K 線的區間時，也重算一次', async () => {
    // 換標的與換區間走的是同一個觸發點：圖上那批被換掉了。
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyStrategy(wrapper, 7)

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-08-01T00:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledTimes(2)
  })

  it('圖上那批 K 線沒換就不重算', async () => {
    // 小幅拖動仍落在手上這批之內：K 線一根都沒換，重算算出來的必定一模一樣。
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyStrategy(wrapper, 7)

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-02T09:00:00.000Z'),
      endTime: new Date('2026-09-02T11:00:00.000Z'),
    })
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
  })

  it('一支都沒套用時，換交易標的不發生任何計算', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
  })
})

describe('圖表上的指標：算不出來的時候', () => {
  it('算式跑不動時就地說明，且圖上沒有它的線', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockRejectedValue(
        new IndicatorScriptFailedError('算式執行失敗：boom')),
    })

    await applyStrategy(wrapper, 7)

    expect(wrapper.get('[data-testid="indicator-error-7"]').text()).toContain('boom')
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(0)
  })

  it('連不上系統時就地說明', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockRejectedValue(
        new BackendUnreachableError('http://localhost:8080')),
    })

    await applyStrategy(wrapper, 7)

    expect(wrapper.get('[data-testid="indicator-error-7"]').text()).toContain('連不上')
  })

  it('一支失敗不影響另一支', async () => {
    const calculateIndicator = vi.fn()
      .mockRejectedValueOnce(new IndicatorScriptFailedError('算式執行失敗'))
      .mockResolvedValue(aCalculation())
    const { wrapper } = await mountPanel({
      strategies: [
        buildStoredStrategy(7, '會失敗的', { resultType: 'float' }),
        buildStoredStrategy(8, '算得出來的', { resultType: 'float' }),
      ],
      calculateIndicator,
    })

    await applyStrategy(wrapper, 7)
    await applyStrategy(wrapper, 8)

    expect(wrapper.find('[data-testid="indicator-error-7"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="indicator-error-8"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(1)
  })

  it('失敗的那一支留在清單上，換了資料就再試一次', async () => {
    // 失敗多半是暫時的：這一段區間根數不夠，換一段就夠了。
    // 把它踢掉會逼使用者重挑一次，而他什麼都沒做錯。
    const calculateIndicator = vi.fn()
      .mockRejectedValueOnce(new IndicatorScriptFailedError('K 線不足'))
      .mockResolvedValue(aCalculation())
    const { wrapper } = await mountPanel({ calculateIndicator })
    await applyStrategy(wrapper, 7)
    expect(wrapper.find('[data-testid="indicator-error-7"]').exists()).toBe(true)

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(wrapper.find('[data-testid="indicator-error-7"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(1)
  })

  it('重算失敗時，上一批算出來的線也要收掉', async () => {
    // 留著它，就是一條看起來完全正常、卻屬於另一段行情的線——
    // 而那正是這整個切片在防的事。
    const calculateIndicator = vi.fn()
      .mockResolvedValueOnce(aCalculation())
      .mockRejectedValue(new IndicatorScriptFailedError('K 線不足'))
    const { wrapper } = await mountPanel({ calculateIndicator })
    await applyStrategy(wrapper, 7)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(1)

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(wrapper.find('[data-testid="indicator-error-7"]').exists()).toBe(true)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(0)
  })
})

describe('圖表上的指標：線的顏色', () => {
  it('換一條線的顏色，圖上立刻換，且不重算', async () => {
    // 重算一次只為了換顏色是荒謬的——算出來的值一個字都不會變。
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyStrategy(wrapper, 7)
    const before = wrapper.findComponent(KCandleChart).props('indicators')

    await wrapper.get('[data-testid="line-color-7:均價"]').setValue('--color-chart-line-5')
    await flushPromises()

    const after = wrapper.findComponent(KCandleChart).props('indicators')
    expect(after?.[0]?.levels[0]?.colorToken).toBe('--color-chart-line-5')
    expect(before?.[0]?.levels[0]?.colorToken).not.toBe('--color-chart-line-5')
    expect(calculateIndicator).toHaveBeenCalledTimes(1)
  })

  it('重新打開畫面再套用同一支，用的是上次挑過的那個顏色', async () => {
    // 顏色是「我習慣哪條線是什麼色」，那個習慣跨越每一次操作。
    // 這條驗的是整條路徑：這台瀏覽器記著的東西，真的變成圖上那條線的顏色。
    const wrapper = mount(KCandleChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(
          new KCandleChartService(buildKCandleProxy())),
        tradingSymbolApplication: buildTradingSymbolApplication(),
        chartIndicatorApplication: buildChartIndicatorApplication(
          { calculateIndicator: vi.fn().mockResolvedValue(aCalculation()) },
          // 上一次打開這個畫面時，使用者替這條線挑過粉色。
          { readColorToken: vi.fn().mockReturnValue('--color-chart-line-5') }),
        strategyApplication: buildStrategyApplication({
          listStrategies: vi.fn().mockResolvedValue(
            [buildStoredStrategy(7, '二十根均線', { resultType: 'float' })]),
        }),
        timeZone: buildTimeZone(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()

    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()

    const indicators = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicators[0]?.levels[0]?.colorToken).toBe('--color-chart-line-5')
  })

  it('連續套用兩支時，它們是不同顏色', async () => {
    const calculateIndicator = vi.fn()
      .mockResolvedValueOnce(aCalculation('甲'))
      .mockResolvedValueOnce(aCalculation('乙'))
    const { wrapper } = await mountPanel({
      strategies: [
        buildStoredStrategy(7, '第一支', { resultType: 'float' }),
        buildStoredStrategy(8, '第二支', { resultType: 'float' }),
      ],
      calculateIndicator,
    })

    await applyStrategy(wrapper, 7)
    await applyStrategy(wrapper, 8)

    const indicators = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicators[0]?.levels[0]?.colorToken)
      .not.toBe(indicators[1]?.levels[0]?.colorToken)
  })
})

describe('圖表上的指標：邊界', () => {
  it('同一支重複挑不會被套用第二次', async () => {
    // 選單本來就不會再列出它，但規則屬於狀態那一層，不該只靠畫面擋。
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyStrategy(wrapper, 7)

    await wrapper.findComponent(ChartIndicatorPanel).vm.$emit(
      'apply', (await buildStrategyApplication({
        listStrategies: vi.fn().mockResolvedValue(
          [buildStoredStrategy(7, '二十根均線', { resultType: 'float' })]),
      }).listStrategies())[0])
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
  })

  it('圖上一根 K 線都沒有時不發計算', async () => {
    // 沒有東西可以算——為此送出一次註定失敗的請求只會多一個要解釋的錯誤。
    const calculateIndicator = vi.fn()
    const emptyChartProxy: IKCandleProxy = {
      ...buildKCandleProxy(),
      findKCandleSeries: vi.fn().mockResolvedValue([]),
    }
    const wrapper = mount(KCandleChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(
          new KCandleChartService(emptyChartProxy)),
        tradingSymbolApplication: buildTradingSymbolApplication(),
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

    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
  })

  it('挑到選單上那個「套用一支策略…」時什麼都不做', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('')
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })

  it('算完但一個指標都沒有時明說，而不是當成失敗', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', '5m', 1, 'float', [])),
    })

    await applyStrategy(wrapper, 7)

    expect(wrapper.get('[data-testid="indicator-draws-nothing"]').text()).toContain('沒有線')
    expect(wrapper.find('[data-testid="indicator-error-7"]').exists()).toBe(false)
  })

  it('沒見過的失敗也說得出一句話，而不是留白', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockRejectedValue('這不是一個 Error'),
    })

    await applyStrategy(wrapper, 7)

    expect(wrapper.get('[data-testid="indicator-error-7"]').text()).toContain('未預期')
  })

  it('一般的錯誤原樣轉達它自己的訊息', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockRejectedValue(new Error('後端說了一句話')),
    })

    await applyStrategy(wrapper, 7)

    expect(wrapper.get('[data-testid="indicator-error-7"]').text()).toContain('後端說了一句話')
  })

  it('取不到策略清單時圖表照畫，只是沒有東西可挑', async () => {
    // 為此擋掉整張圖，等於讓一個附加功能決定主功能能不能用。
    const wrapper = mount(KCandleChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(
          new KCandleChartService(buildKCandleProxy())),
        tradingSymbolApplication: buildTradingSymbolApplication(),
        chartIndicatorApplication: buildChartIndicatorApplication(),
        strategyApplication: buildStrategyApplication({
          listStrategies: vi.fn().mockRejectedValue(
            new BackendUnreachableError('http://localhost:8080')),
        }),
        timeZone: buildTimeZone(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
    expect(wrapper.get('[data-testid="chart-indicator-empty"]').text()).toContain('還沒有任何策略')
  })

  it('一支畫出兩條線時兩條都列出來，各有各的顏色', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockResolvedValue(
        new IndicatorCalculation('BTCUSDT', '5m', 2, 'floatList', [
          new IndicatorValueVo('收盤', [1, 2]),
          new IndicatorValueVo('最高', [3, 4]),
        ], [new Date('2026-09-02T10:00:00.000Z'), new Date('2026-09-02T10:05:00.000Z')])),
    })

    await applyStrategy(wrapper, 7)

    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(2)
    const indicators = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicators[0]?.series[0]?.colorToken)
      .not.toBe(indicators[0]?.series[1]?.colorToken)
  })
})

describe('圖表上的指標：慢回來的那一次不能亂講話', () => {
  /** 讓一次計算卡住，由測試決定它什麼時候回來。 */
  function deferredCalculation() {
    const resolvers: ((calculation: IndicatorCalculation) => void)[] = []
    const calculateIndicator = vi.fn(() => new Promise<IndicatorCalculation>((resolve) => {
      resolvers.push(resolve)
    }))

    return { calculateIndicator, resolvers }
  }

  it('正在算的時候移除它，結果回來也不會把線加回圖上', async () => {
    // 加回去的話，圖上會有一條線，而清單上已經沒有那一列可以再移除它。
    const { calculateIndicator, resolvers } = deferredCalculation()
    const { wrapper } = await mountPanel({ calculateIndicator })

    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    await wrapper.get('[data-testid="remove-indicator-7"]').trigger('click')
    await flushPromises()

    resolvers[0]?.(aCalculation())
    await flushPromises()

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(0)
  })

  it('慢回來的舊標的不會蓋掉比它新的那一次', async () => {
    // BTC→ETH→BTC：慢的 ETH 回應若被採用，圖上畫的就是**另一檔**的值，而且不報錯。
    const { calculateIndicator, resolvers } = deferredCalculation()
    const { wrapper } = await mountPanel({ calculateIndicator })

    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    resolvers[0]?.(aCalculation('BTC 的值'))
    await flushPromises()

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()
    await wrapper.get('[data-testid="symbol-select"]').setValue('BTCUSDT')
    await flushPromises()

    // 最新那一次（BTC）先回來，被換掉的那一次（ETH）後回來。
    resolvers[2]?.(aCalculation('最新的 BTC'))
    await flushPromises()
    resolvers[1]?.(aCalculation('過期的 ETH'))
    await flushPromises()

    const indicators = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicators[0]?.levels[0]?.indicatorName).toBe('最新的 BTC')
  })

  it('上一輪全部失敗之後重算，它們仍然拿到不同的顏色', async () => {
    // 「已經用掉的顏色」只看得到算完的那幾支。上一輪全滅時那份清單是空的，
    // 一起送出去就會全部拿到第一個顏色。
    const calculateIndicator = vi.fn()
      .mockRejectedValueOnce(new IndicatorScriptFailedError('K 線不足'))
      .mockRejectedValueOnce(new IndicatorScriptFailedError('K 線不足'))
      .mockResolvedValueOnce(aCalculation('甲'))
      .mockResolvedValueOnce(aCalculation('乙'))
    const { wrapper } = await mountPanel({
      strategies: [
        buildStoredStrategy(7, '第一支', { resultType: 'float' }),
        buildStoredStrategy(8, '第二支', { resultType: 'float' }),
      ],
      calculateIndicator,
    })
    await applyStrategy(wrapper, 7)
    await applyStrategy(wrapper, 8)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(0)

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    const indicators = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicators).toHaveLength(2)
    expect(indicators[0]?.levels[0]?.colorToken)
      .not.toBe(indicators[1]?.levels[0]?.colorToken)
  })
})

describe('圖表上的指標：圖沒了的時候', () => {
  it('取行情失敗時，上一批的線也一起收掉', async () => {
    // 留著它們，就是在一張空圖上畫另一段行情的線——而且還撐著價格軸。
    const findKCandleSeries = vi.fn()
      .mockResolvedValueOnce([buildKCandle('2026-09-02T10:00:00.000Z', '110')])
      .mockRejectedValue(new BackendServerError('後端出錯了'))
    const wrapper = mount(KCandleChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(
          new KCandleChartService({ ...buildKCandleProxy(), findKCandleSeries })),
        tradingSymbolApplication: buildTradingSymbolApplication(),
        chartIndicatorApplication: buildChartIndicatorApplication({
          calculateIndicator: vi.fn().mockResolvedValue(aCalculation()),
        }),
        strategyApplication: buildStrategyApplication({
          listStrategies: vi.fn().mockResolvedValue(
            [buildStoredStrategy(7, '二十根均線', { resultType: 'float' })]),
        }),
        timeZone: buildTimeZone(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(1)

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    // 圖沒了，上一批算出來的線也不能留——它們畫的是另一段行情。
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(0)
    // 清單留著——使用者沒有取消掛任何一支，等圖回來它們會跟著重算。
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
  })
})
