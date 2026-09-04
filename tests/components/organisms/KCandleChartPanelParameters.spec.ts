import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import ChartIndicatorPanel from '~/components/molecules/ChartIndicatorPanel.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IStrategyParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-parameter-value-preference-proxy'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildLiveKCandleApplication } from '../../fixtures/live-k-candle-application'
import { buildTimeZone } from '../../fixtures/time-zone'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-09-02T12:00:00.000Z')

function buildKCandleProxy(): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn().mockResolvedValue([new KCandle(
      'BTCUSDT', new Date('2026-09-02T10:00:00.000Z'),
      new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('110'),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))]),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
  }
}

function aCalculation(indicatorName = '均價') {
  return new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo(indicatorName, [115])])
}

/** 一支帶著一個旋鈕的策略：期數，預設 20。 */
function strategyWithLookback(id = 7, name = '均線') {
  return buildStoredStrategy(id, name, {
    resultType: 'float',
    parameters: [new StrategyParameterDto('期數', 'lookbackCount', 20)],
  })
}

async function mountPanel(overrides: {
  strategies?: ReturnType<typeof buildStoredStrategy>[]
  calculateIndicator?: Mock<IIndicatorCalculationProxy['calculateIndicator']>
  parameterValuePreference?: Partial<IStrategyParameterValuePreferenceProxy>
  colorPreference?: Partial<IChartLineColorPreferenceProxy>
  strategyProxy?: Partial<IStrategyProxy>
} = {}) {
  const strategies = overrides.strategies ?? [strategyWithLookback()]
  const calculateIndicator = overrides.calculateIndicator
    ?? vi.fn().mockResolvedValue(aCalculation())
  const writeValue = vi.fn()
  const updateStrategy = vi.fn()
  const createStrategy = vi.fn()

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildKCandleProxy())),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      liveKCandleApplication: buildLiveKCandleApplication(),
      chartIndicatorApplication: buildChartIndicatorApplication(
        { calculateIndicator },
        overrides.colorPreference ?? {},
        { writeValue, ...overrides.parameterValuePreference },
      ),
      strategyApplication: buildStrategyApplication({
        listStrategies: vi.fn().mockResolvedValue(strategies),
        updateStrategy,
        createStrategy,
        ...overrides.strategyProxy,
      }),
      timeZone: buildTimeZone(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return { wrapper, calculateIndicator, writeValue, updateStrategy, createStrategy }
}

type Panel = Awaited<ReturnType<typeof mountPanel>>['wrapper']

async function pickStrategy(wrapper: Panel, id: number) {
  await wrapper.get('[data-testid="chart-indicator-picker"]').setValue(String(id))
  await flushPromises()
}

async function setPendingValue(wrapper: Panel, name: string, value: string) {
  await wrapper.get(`[data-testid="pending-indicator"] [data-testid="applied-parameter-${name}"]`)
    .setValue(value)
  await flushPromises()
}

async function confirmPending(wrapper: Panel) {
  await wrapper.get('[data-testid="confirm-pending-indicator"]').trigger('click')
  await flushPromises()
}

/**
 * 點開某一筆的設定。
 *
 * 參數值與線色都在那裡面——清單上一列只說「它是誰、畫了什麼顏色、這一次的值」，
 * 要改東西就點那一列。
 */
async function openSettings(wrapper: Panel, appliedIndicatorId: number) {
  await wrapper.get(`[data-testid="open-indicator-${appliedIndicatorId}"]`).trigger('click')
  await flushPromises()
}

async function closeSettings(wrapper: Panel) {
  await wrapper.get('[data-testid="close-applied-indicator-button"]').trigger('click')
  await flushPromises()
}

/** 那一筆畫出來的線是什麼顏色。一次只開得了一個對話框，所以看完就關上。 */
async function lineColorsOf(wrapper: Panel, appliedIndicatorId: number) {
  await openSettings(wrapper, appliedIndicatorId)
  const colors = wrapper.findAll('[data-testid="indicator-line"] select')
    .map(select => (select.element as HTMLSelectElement).value)
  await closeSettings(wrapper)

  return colors
}

/** 改已經在圖上那一筆的某一格。 */
async function changeAppliedValue(
  wrapper: Panel, appliedIndicatorId: number, name: string, value: string,
) {
  await openSettings(wrapper, appliedIndicatorId)
  await wrapper.get(`[data-testid="applied-parameter-${name}"]`).setValue(value)
  await flushPromises()
  await closeSettings(wrapper)
}

/** 挑一支、把期數調成某個值、加進來——三步併成使用者眼中的一件事。 */
async function applyWithLookback(wrapper: Panel, id: number, value: string) {
  await pickStrategy(wrapper, id)
  await setPendingValue(wrapper, '期數', value)
  await confirmPending(wrapper)
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('圖表上的旋鈕：套上去之前就先調', () => {
  it('挑一支有旋鈕的，先出現那幾格且還沒上圖', async () => {
    // 若先上圖再調，第一次必然拿預設值跑一趟，畫出一條使用者沒有要的線，
    // 然後立刻被第二次計算蓋掉——圖上會閃一下，而那一瞬間的線是錯的。
    const { wrapper, calculateIndicator } = await mountPanel()

    await pickStrategy(wrapper, 7)

    const field = wrapper.get<HTMLInputElement>(
      '[data-testid="pending-indicator"] [data-testid="applied-parameter-期數"]')
    expect(field.element.value).toBe('20')
    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })

  it('調好之後才上圖，算的是調過的那個值', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await applyWithLookback(wrapper, 7, '60')

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(calculateIndicator).toHaveBeenCalledWith(expect.objectContaining({
      parameters: expect.objectContaining({
        all: [expect.objectContaining({ name: '期數', value: 60 })],
      }),
    }))
  })

  it('一個旋鈕都沒有的策略挑了就直接上圖，中間不多一步', async () => {
    const { wrapper, calculateIndicator } = await mountPanel({
      strategies: [buildStoredStrategy(9, '無旋鈕', { resultType: 'float' })],
    })

    await pickStrategy(wrapper, 9)

    expect(wrapper.find('[data-testid="pending-indicator"]').exists()).toBe(false)
    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
  })

  it('上次調過的值就是這次那一格的起點', async () => {
    const { wrapper } = await mountPanel({
      parameterValuePreference: { readValue: vi.fn().mockReturnValue(60) },
    })

    await pickStrategy(wrapper, 7)

    expect(wrapper.get<HTMLInputElement>(
      '[data-testid="pending-indicator"] [data-testid="applied-parameter-期數"]').element.value)
      .toBe('60')
  })

  it('這台瀏覽器不讓網站存東西時，起點是策略記著的預設值且照樣算得出來', async () => {
    // 存不了東西對這一層長得就是「沒調過」——真正的吞例外發生在儲存那一側，
    // 由它自己的測試釘住（見 strategy-parameter-value-preference-proxy 那一份）。
    const { wrapper, calculateIndicator } = await mountPanel({
      parameterValuePreference: { readValue: vi.fn().mockReturnValue(null) },
    })

    await pickStrategy(wrapper, 7)
    expect(wrapper.get<HTMLInputElement>(
      '[data-testid="pending-indicator"] [data-testid="applied-parameter-期數"]').element.value)
      .toBe('20')

    await confirmPending(wrapper)

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-testid="indicator-error-1"]')).toHaveLength(0)
  })

  it('在圖上調過的值不會改動策略記著的預設值', async () => {
    // 這裡套用的是一支已經定案的策略。改掉它的預設值，使用者明天打開別的圖
    // 會發現策略被自己改過，而他根本不記得改過。
    const { wrapper, updateStrategy, createStrategy } = await mountPanel()

    await applyWithLookback(wrapper, 7, '60')

    expect(updateStrategy).not.toHaveBeenCalled()
    expect(createStrategy).not.toHaveBeenCalled()
  })

  it('值不合法時就地說明，而且完全不算', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await pickStrategy(wrapper, 7)
    await setPendingValue(wrapper, '期數', '0')
    await confirmPending(wrapper)

    expect(wrapper.get('[data-testid="pending-parameters-alert"]').text())
      .toContain('大於零的整數')
    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })

  it('取消就什麼都沒發生——那一筆從來沒上過圖', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await pickStrategy(wrapper, 7)
    await wrapper.get('[data-testid="cancel-pending-indicator"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="pending-indicator"]').exists()).toBe(false)
    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })
})

describe('圖表上的旋鈕：同一支可以擺好幾次', () => {
  it('擺兩次就是兩筆兩條線', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(2)
    expect(calculateIndicator).toHaveBeenCalledTimes(2)
  })

  it('清單上用值分辨它們——那是它們唯一的差別', async () => {
    const { wrapper } = await mountPanel()

    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    const summaries = wrapper.findAll('[data-testid="applied-indicator-summary"]')
      .map(summary => summary.text())
    expect(summaries).toEqual(['期數 20', '期數 60'])
  })

  it('移除其中一筆只影響那一筆', async () => {
    const { wrapper } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    await wrapper.get('[data-testid="remove-indicator-1"]').trigger('click')
    await flushPromises()

    const remaining = wrapper.findAll('[data-testid="applied-indicator-summary"]')
      .map(summary => summary.text())
    expect(remaining).toEqual(['期數 60'])
  })

  it('沒有旋鈕的策略也可以擺兩次，只是沒有值可標', async () => {
    const { wrapper } = await mountPanel({
      strategies: [buildStoredStrategy(9, '無旋鈕', { resultType: 'float' })],
    })

    await pickStrategy(wrapper, 9)
    await pickStrategy(wrapper, 9)

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="applied-indicator-summary"]')).toHaveLength(0)
  })

  it('同一支擺兩次，兩條線預設就是不同顏色', async () => {
    const { wrapper } = await mountPanel()

    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    const [first] = await lineColorsOf(wrapper, 1)
    const [second] = await lineColorsOf(wrapper, 2)
    expect(first).toBeDefined()
    expect(second).not.toBe(first)
  })

  it('挑過顏色的那條線，第二次擺上來時不沿用它', async () => {
    // 占著那個顏色的不是「別條線」，是它自己的第一份。
    const remembered = '--color-chart-line-4'
    const { wrapper } = await mountPanel({
      colorPreference: { readColorToken: vi.fn().mockReturnValue(remembered) },
    })

    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    expect((await lineColorsOf(wrapper, 1))[0]).toBe(remembered)
    expect((await lineColorsOf(wrapper, 2))[0]).not.toBe(remembered)
  })

  it('移除第一筆之後再擺一次，記住的顏色回來了', async () => {
    const remembered = '--color-chart-line-4'
    const { wrapper } = await mountPanel({
      colorPreference: { readColorToken: vi.fn().mockReturnValue(remembered) },
    })
    await applyWithLookback(wrapper, 7, '20')

    await wrapper.get('[data-testid="remove-indicator-1"]').trigger('click')
    await flushPromises()
    await applyWithLookback(wrapper, 7, '60')

    expect((await lineColorsOf(wrapper, 2))[0]).toBe(remembered)
  })
})

describe('圖表上的旋鈕：調完之後', () => {
  it('改一筆的值只有那一筆重算', async () => {
    const { wrapper, calculateIndicator } = await mountPanel({
      strategies: [strategyWithLookback(7, '均線'), strategyWithLookback(8, '布林')],
    })
    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 8, '2')
    calculateIndicator.mockClear()

    await changeAppliedValue(wrapper, 1, '期數', '60')

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(calculateIndicator).toHaveBeenCalledWith(expect.objectContaining({
      parameters: expect.objectContaining({
        all: [expect.objectContaining({ value: 60 })],
      }),
    }))
  })

  it('改過的值被記下來', async () => {
    const { wrapper, writeValue } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    writeValue.mockClear()

    await changeAppliedValue(wrapper, 1, '期數', '60')

    expect(writeValue).toHaveBeenCalledWith(7, '期數', 60)
  })

  it('加進來的當下就把這一次的值記下來', async () => {
    const { wrapper, writeValue } = await mountPanel()

    await applyWithLookback(wrapper, 7, '60')

    expect(writeValue).toHaveBeenCalledWith(7, '期數', 60)
  })
})

describe('圖表上的旋鈕：算不出來的時候', () => {
  it('名字對不上時就地指名，而且不說算式跑不動', async () => {
    const { wrapper } = await mountPanel({
      calculateIndicator: vi.fn().mockRejectedValue(new StrategyParameterNotDeclaredError(
        '期數', '算式取用了參數 "期數"，但這一次沒有宣告這個名字')),
    })

    await applyWithLookback(wrapper, 7, '20')

    const message = wrapper.get('[data-testid="indicator-error-1"]').text()
    expect(message).toContain('期數')
    expect(message).not.toContain('算式執行失敗')
    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(0)
  })

  it('同一支擺兩次，只有失敗那一筆沒有線', async () => {
    const calculateIndicator = vi.fn()
      .mockResolvedValueOnce(aCalculation())
      .mockRejectedValueOnce(new IndicatorScriptFailedError('算式執行失敗'))
    const { wrapper } = await mountPanel({ calculateIndicator })

    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    expect(wrapper.findAll('[data-testid="indicator-error-1"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="indicator-error-2"]').text()).toContain('算式執行失敗')
    expect(await lineColorsOf(wrapper, 1)).toHaveLength(1)
    expect(await lineColorsOf(wrapper, 2)).toHaveLength(0)
  })
})

describe('圖表上的旋鈕：改到一半與改不動的值', () => {
  it('把一格清空時不當成填了零，也不重算', async () => {
    // 清空是「還在打」的中間狀態。讀成 0 會讓使用者在打完之前就先看到一則錯誤，
    // 而 0 在回看根數那一種還是不合法的——他什麼都還沒做錯。
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    calculateIndicator.mockClear()

    await changeAppliedValue(wrapper, 1, '期數', '')

    expect(calculateIndicator).not.toHaveBeenCalled()
  })

  it('把已經在圖上那一筆的值改成不合法的，不重算也不換掉它', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    calculateIndicator.mockClear()

    await changeAppliedValue(wrapper, 1, '期數', '0')

    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="applied-indicator-summary"]').text()).toBe('期數 20')
  })

  it('改一筆已經不在清單上的，什麼都不做', async () => {
    // 移除與一個還在飛的改值事件可能擦身而過。
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    calculateIndicator.mockClear()

    await wrapper.findComponent(ChartIndicatorPanel).vm.$emit(
      'changeAppliedParameterValue', 99, '期數', 60)
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
  })

  it.each([
    { action: '確認', event: 'confirmPending' },
    { action: '改值', event: 'changePendingParameterValue' },
  ])('沒有待調整那一筆時，$action 什麼都不做', async ({ event }) => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await wrapper.findComponent(ChartIndicatorPanel).vm.$emit(event, '期數', 60)
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })

  it('畫成曲線的策略擺兩次，兩條曲線也是不同顏色', async () => {
    // 一串數字走的是另一條路：它畫成跟著 K 線走的曲線，不是水平線。
    const { wrapper } = await mountPanel({
      strategies: [buildStoredStrategy(7, '均線', {
        resultType: 'floatList',
        parameters: [new StrategyParameterDto('期數', 'lookbackCount', 20)],
      })],
      calculateIndicator: vi.fn().mockResolvedValue(new IndicatorCalculation(
        'BTCUSDT', '5m', 1, 'floatList', [new IndicatorValueVo('均線', [115])],
        [new Date('2026-09-02T10:00:00.000Z')])),
    })

    await applyWithLookback(wrapper, 7, '20')
    await applyWithLookback(wrapper, 7, '60')

    const [first] = await lineColorsOf(wrapper, 1)
    const [second] = await lineColorsOf(wrapper, 2)
    expect(first).toBeDefined()
    expect(second).not.toBe(first)
  })
})

describe('圖表上的指標：一列一筆，點下去設定', () => {
  it('清單上一列就說完它是誰、畫了什麼顏色、這一次的值', async () => {
    const { wrapper } = await mountPanel()

    await applyWithLookback(wrapper, 7, '60')

    const row = wrapper.get('[data-testid="open-indicator-1"]')
    expect(row.text()).toContain('均線')
    expect(row.text()).toContain('期數 60')
    expect(row.findAll('.chart-indicator-panel__swatch').length).toBeGreaterThan(0)
  })

  it('沒點開的時候，可以改的東西一個都不佔清單的版面', async () => {
    // 改值與換色都是偶爾才做一次的事。攤在清單上會讓每一筆長高好幾倍，
    // 而使用者多數時候只是在看圖上現在有哪幾條。
    const { wrapper } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')

    expect(wrapper.findAll('[data-testid="applied-parameter-期數"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(0)
  })

  it('點那一列就開得出它的參數與線色', async () => {
    const { wrapper } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')

    await openSettings(wrapper, 1)

    expect(wrapper.get<HTMLInputElement>('[data-testid="applied-parameter-期數"]').element.value)
      .toBe('20')
    expect(wrapper.findAll('[data-testid="indicator-line"]')).toHaveLength(1)
  })

  it('開著的時候被重算，看到的是新的那一份而不是開啟當下那一份', async () => {
    // 對話框每次都從清單裡重新找那一筆。存起來的話，重算之後它會繼續顯示上一輪的東西。
    const { wrapper } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    await openSettings(wrapper, 1)

    await wrapper.get('[data-testid="applied-parameter-期數"]').setValue('60')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('[data-testid="applied-parameter-期數"]').element.value)
      .toBe('60')
  })

  it('開著的那一筆被移除時，對話框自己關上', async () => {
    // 找不到就是沒有——留著一個對著已經不存在那一筆的設定畫面，改什麼都不會有事發生。
    const { wrapper } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')
    await openSettings(wrapper, 1)

    await wrapper.get('[data-testid="remove-indicator-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="close-applied-indicator-button"]').exists()).toBe(false)
  })

  it('按移除不會順手把設定打開——它們在同一列上', async () => {
    const { wrapper } = await mountPanel()
    await applyWithLookback(wrapper, 7, '20')

    await wrapper.get('[data-testid="remove-indicator-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="close-applied-indicator-button"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })
})
