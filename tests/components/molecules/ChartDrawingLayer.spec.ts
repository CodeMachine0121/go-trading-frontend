import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ChartDrawingLayer from '~/components/molecules/ChartDrawingLayer.vue'
import type { ChartDrawingDto } from '~/domain/models/dto/chart-drawing-dto'
import type { ChartDrawingKindValue } from '~/domain/models/vo/chart-drawing-kind-vo'
import { ChartCoordinateSpace } from '~/utilities/chart-coordinate-space'
import { buildChartDrawingApplication } from '../../fixtures/chart-drawing-application'
import { anchorOf, chartDrawingOf } from '../../fixtures/chart-drawing'
import { KCandleSpec, kCandleChartOf } from '../../fixtures/k-candle-chart'
import { buildTimeZone } from '../../fixtures/time-zone'

// 繪圖函式庫是最外層的邊界，以替身換掉：每一根寬 10 像素（第 i 根在 x = 10i），
// 價格與 y 的換算是 y = 1000 − 價格。圖區 500 × 400，所以價格 600～1000 都在圖上。
const chartApi = {
  timeScale: () => ({
    logicalToCoordinate: (logical: number) => logical * 10,
    coordinateToLogical: (x: number) => x / 10,
    width: () => 500,
    height: () => 30,
    getVisibleLogicalRange: () => ({ from: 0, to: 50 }),
  }),
  paneSize: () => ({ height: 400 }),
  priceScale: () => ({ width: () => 60 }),
  applyOptions: vi.fn(),
}
const series = {
  priceToCoordinate: (price: number) => 1000 - price,
  coordinateToPrice: (y: number) => 1000 - y,
  priceFormatter: () => ({ format: (price: number) => price.toFixed(2) }),
}
const coordinateSpace = new ChartCoordinateSpace(
  chartApi as unknown as IChartApi, () => series as unknown as ISeriesApi<SeriesType>)

/** 第 0 根到第 39 根，每分鐘一根；第 10 根的高 905、收 903。 */
const CHART = kCandleChartOf('1m', Array.from({ length: 40 }, (_, index) => new KCandleSpec(
  new Date(Date.UTC(2026, 9, 16, 10, index)).toISOString(),
  '900', index === 10 ? '905' : '900', '899', index === 10 ? '903' : '900')))
const openTimeOf = (index: number) => new Date(Date.UTC(2026, 9, 16, 10, index)).toISOString()

let mounted: VueWrapper | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
})

function mountLayer(props: {
  drawings?: ChartDrawingDto[]
  selectedDrawingId?: number | null
  activeDrawingKind?: ChartDrawingKindValue | null
  magnet?: boolean
  lockAllDrawings?: boolean
} = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted = mount(ChartDrawingLayer, {
    attachTo: host,
    props: {
      coordinateSpace,
      chart: CHART,
      chartDrawingApplication: buildChartDrawingApplication(),
      drawings: props.drawings ?? [],
      selectedDrawingId: props.selectedDrawingId ?? null,
      activeDrawingKind: props.activeDrawingKind ?? null,
      magnet: props.magnet ?? false,
      lockAllDrawings: props.lockAllDrawings ?? false,
      timeZone: buildTimeZone(),
    },
  })

  return mounted
}

function root(wrapper: VueWrapper): HTMLElement {
  const element = wrapper.element.parentElement
  if (element === null) {
    throw new Error('繪圖層沒有掛在任何東西上')
  }

  return element
}

/** 在圖上按下、移到另一點、放開——中間可以不動（那就是點一下）。 */
async function press(wrapper: VueWrapper, from: [number, number], to: [number, number] = from) {
  const target = root(wrapper)
  const pressed = new PointerEvent('pointerdown', { clientX: from[0], clientY: from[1], button: 0, bubbles: true, cancelable: true })
  target.dispatchEvent(pressed)
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: to[0], clientY: to[1] }))
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: to[0], clientY: to[1] }))
  await nextTick()

  return pressed
}

const finished = (wrapper: VueWrapper) => wrapper.emitted<[ChartDrawingDto]>('finish')?.[0]?.[0]
const anchorsOf = (drawing: ChartDrawingDto | undefined) =>
  drawing?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()])

describe('ChartDrawingLayer：畫', () => {
  it('選了趨勢線、按住從 A 拖到 B：畫出 A 到 B，這一下不交給圖', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'trendLine' })

    const pressed = await press(wrapper, [100, 200], [300, 150])

    expect(pressed.defaultPrevented).toBe(true)
    expect(finished(wrapper)?.kind).toBe('trendLine')
    expect(anchorsOf(finished(wrapper))).toEqual([[openTimeOf(10), '800'], [openTimeOf(30), '850']])
  })

  it('點一下、移動、再點一下：同樣畫出那一條', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'trendLine' })

    await press(wrapper, [100, 200])
    expect(wrapper.emitted('finish')).toBeUndefined()
    await press(wrapper, [300, 150])

    expect(anchorsOf(finished(wrapper))).toEqual([[openTimeOf(10), '800'], [openTimeOf(30), '850']])
  })

  it('拖不到 5 像素就放開：算點一下，等第二下', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'rectangle' })

    await press(wrapper, [100, 200], [103, 202])

    expect(wrapper.emitted('finish')).toBeUndefined()
  })

  it('畫到一半換了工具（按 Esc 回到游標）：半成品丟掉，下一下不會把它畫完', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'trendLine' })
    await press(wrapper, [100, 200])

    await wrapper.setProps({ activeDrawingKind: null })
    await press(wrapper, [300, 150])

    expect(wrapper.emitted('finish')).toBeUndefined()
  })

  it('水平線點一下就畫好', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'horizontalLine' })

    await press(wrapper, [200, 250])

    expect(finished(wrapper)?.kind).toBe('horizontalLine')
    expect(anchorsOf(finished(wrapper))).toEqual([[openTimeOf(20), '750']])
  })

  it('開著磁鐵：落在第 10 根上靠近 904.8 的位置，吸到最高價 905', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'horizontalLine', magnet: true })

    await press(wrapper, [100, 95.2])

    expect(anchorsOf(finished(wrapper))).toEqual([[openTimeOf(10), '905']])
  })

  it('落在價格軸或時間軸上：不畫，交給圖', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'horizontalLine' })

    const pressed = await press(wrapper, [520, 100])

    expect(pressed.defaultPrevented).toBe(false)
    expect(wrapper.emitted('finish')).toBeUndefined()
  })

  it('不是左鍵：不畫', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'horizontalLine' })

    root(wrapper).dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, bubbles: true }))

    expect(wrapper.emitted('finish')).toBeUndefined()
  })
})

describe('ChartDrawingLayer：選取與拖動', () => {
  const TREND_LINE = chartDrawingOf(1, 'trendLine', [anchorOf(openTimeOf(10), '800'), anchorOf(openTimeOf(30), '800')]).toDomain().toDto()
  const LOCKED = chartDrawingOf(1, 'trendLine', [anchorOf(openTimeOf(10), '800'), anchorOf(openTimeOf(30), '800')], true).toDomain().toDto()
  const RECTANGLE = chartDrawingOf(2, 'rectangle', [anchorOf(openTimeOf(10), '900'), anchorOf(openTimeOf(30), '700')]).toDomain().toDto()

  it('游標狀態點那條線：選取它，這一下不交給圖', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE] })

    const pressed = await press(wrapper, [200, 200])

    expect(wrapper.emitted('select')).toEqual([[1]])
    expect(pressed.defaultPrevented).toBe(true)
  })

  it('點空白處：有選取時取消選取，這一下交給圖去拖', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE], selectedDrawingId: 1 })

    const pressed = await press(wrapper, [200, 50])

    expect(wrapper.emitted('select')).toEqual([[null]])
    expect(pressed.defaultPrevented).toBe(false)
  })

  it('點空白處而沒有選取：什麼都不說', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE] })

    await press(wrapper, [200, 50])

    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('拖那條線往上 50 像素、往右兩根：兩端一起移，放手才算一步', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE] })

    await press(wrapper, [200, 200], [220, 150])

    const [id, command] = wrapper.emitted<[number, { kind: string, anchors: ChartDrawingDto['anchors'] }]>('change')?.[0] ?? []
    expect(id).toBe(1)
    expect(command?.kind).toBe('replaceAnchors')
    expect(command?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([[openTimeOf(12), '850'], [openTimeOf(32), '850']])
  })

  it('點一下沒有拖：選取，但不算一步', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE] })

    await press(wrapper, [200, 200])

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('鎖定的那一條：點得到、拖不動', async () => {
    const wrapper = mountLayer({ drawings: [LOCKED] })

    await press(wrapper, [200, 200], [220, 150])

    expect(wrapper.emitted('select')).toEqual([[1]])
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('開著鎖定所有繪圖：拖不動', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE], lockAllDrawings: true })

    await press(wrapper, [200, 200], [220, 150])

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('拖選取中矩形右邊的中點往右：只有右邊那條邊動', async () => {
    const wrapper = mountLayer({ drawings: [RECTANGLE], selectedDrawingId: 2 })

    await press(wrapper, [300, 200], [350, 260])

    const command = wrapper.emitted<[number, { anchors: ChartDrawingDto['anchors'] }]>('change')?.[0]?.[1]
    expect(command?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([[openTimeOf(10), '900'], [openTimeOf(35), '700']])
  })

  it('拖選取中趨勢線的端點：只有那一端動', async () => {
    const wrapper = mountLayer({ drawings: [TREND_LINE], selectedDrawingId: 1 })

    await press(wrapper, [300, 200], [350, 100])

    const command = wrapper.emitted<[number, { anchors: ChartDrawingDto['anchors'] }]>('change')?.[0]?.[1]
    expect(command?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([[openTimeOf(10), '800'], [openTimeOf(35), '900']])
  })

  it.each([
    ['水平線', chartDrawingOf(3, 'horizontalLine', [anchorOf(openTimeOf(5), '800')]), [400, 202]],
    ['水平射線（點在它右邊）', chartDrawingOf(3, 'horizontalRay', [anchorOf(openTimeOf(5), '800')]), [400, 202]],
    ['垂直線', chartDrawingOf(3, 'verticalLine', [anchorOf(openTimeOf(5), '800')]), [52, 380]],
    ['射線（點在第二點之外的延伸上）', chartDrawingOf(3, 'ray', [anchorOf(openTimeOf(10), '800'), anchorOf(openTimeOf(20), '800')]), [400, 200]],
    ['斐波那契回撤（點在框裡）', chartDrawingOf(3, 'fibonacciRetracement', [anchorOf(openTimeOf(10), '700'), anchorOf(openTimeOf(30), '900')]), [200, 250]],
    ['日期與價格範圍（點在框裡）', chartDrawingOf(3, 'dateAndPriceRange', [anchorOf(openTimeOf(10), '700'), anchorOf(openTimeOf(30), '900')]), [200, 250]],
  ] as const)('點得到%s', async (_, drawing, at) => {
    const wrapper = mountLayer({ drawings: [drawing.toDomain().toDto()] })

    await press(wrapper, [at[0], at[1]])

    expect(wrapper.emitted('select')).toEqual([[3]])
  })

  it('水平射線起點左邊點不到它', async () => {
    const wrapper = mountLayer({ drawings: [chartDrawingOf(3, 'horizontalRay', [anchorOf(openTimeOf(20), '800')]).toDomain().toDto()] })

    await press(wrapper, [100, 200])

    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('兩個疊在一起時點到的是後畫的那一個', async () => {
    const wrapper = mountLayer({ drawings: [RECTANGLE, TREND_LINE] })

    await press(wrapper, [200, 200])

    expect(wrapper.emitted('select')).toEqual([[1]])
  })
})

describe('ChartDrawingLayer：畫在圖上與軸上的字', () => {
  /** 一個記下每一句 fillText 的畫布；其餘的畫筆動作都接下來但不在意。 */
  function recordingContext() {
    const texts: string[] = []
    const context = new Proxy({ texts } as Record<string, unknown>, {
      get: (target, property: string) => {
        if (property === 'fillText') {
          return (text: string) => texts.push(text)
        }
        if (property === 'measureText') {
          return (text: string) => ({ width: text.length * 6 })
        }
        return property in target ? target[property] : () => {}
      },
      set: (target, property: string, value: unknown) => {
        target[property] = value
        return true
      },
    })

    return { context, texts }
  }

  async function paintedTexts(props: Parameters<typeof mountLayer>[0] & { countdown?: string | null }) {
    const { context, texts } = recordingContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const wrapper = mountLayer(props)
    if (props.countdown !== undefined) {
      await wrapper.setProps({ countdown: props.countdown })
    }
    frames.shift()?.(0)

    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    return texts
  }

  it('水平線在價格軸上常駐它的價格', async () => {
    const texts = await paintedTexts({ drawings: [chartDrawingOf(1, 'horizontalLine', [anchorOf(openTimeOf(5), '800')]).toDomain().toDto()] })

    expect(texts).toContain('800.00')
  })

  it('垂直線在時間軸上常駐它的時間', async () => {
    const texts = await paintedTexts({ drawings: [chartDrawingOf(1, 'verticalLine', [anchorOf(openTimeOf(5), '800')]).toDomain().toDto()] })

    expect(texts).toContain('2026-10-16 10:05')
  })

  it('斐波那契回撤左側寫「比例（價格）」', async () => {
    const texts = await paintedTexts({ drawings: [chartDrawingOf(1, 'fibonacciRetracement',
      [anchorOf(openTimeOf(10), '700'), anchorOf(openTimeOf(30), '900')]).toDomain().toDto()] })

    expect(texts).toEqual(expect.arrayContaining(['0(900.00)', '0.5(800.00)', '0.618(776.40)', '1(700.00)']))
  })

  it('日期與價格範圍在框外寫價差、百分比、根數、經過多久與成交量', async () => {
    const texts = await paintedTexts({ drawings: [chartDrawingOf(1, 'dateAndPriceRange',
      [anchorOf(openTimeOf(10), '800'), anchorOf(openTimeOf(30), '880')]).toDomain().toDto()] })

    expect(texts).toEqual(expect.arrayContaining(['80.00 (10.00%)', '20 根，20分', '成交量 21']))
  })

  it('往下量時價差帶負號', async () => {
    const texts = await paintedTexts({ drawings: [chartDrawingOf(1, 'dateAndPriceRange',
      [anchorOf(openTimeOf(10), '880'), anchorOf(openTimeOf(12), '800')]).toDomain().toDto()] })

    expect(texts).toContain('−80.00 (−9.09%)')
  })

  it('選取中的繪圖：每個錨點的價與時間寫在兩條軸上', async () => {
    const texts = await paintedTexts({
      drawings: [chartDrawingOf(1, 'trendLine', [anchorOf(openTimeOf(10), '800'), anchorOf(openTimeOf(30), '850')]).toDomain().toDto()],
      selectedDrawingId: 1,
    })

    expect(texts).toEqual(expect.arrayContaining(['800.00', '850.00', '2026-10-16 10:10', '2026-10-16 10:30']))
  })

  it('最新價下面寫收盤倒數', async () => {
    expect(await paintedTexts({ countdown: '00:42' })).toContain('00:42')
  })

  it('已經收完時不寫倒數', async () => {
    expect(await paintedTexts({ countdown: null })).toEqual([])
  })
})

describe('ChartDrawingLayer：其餘的點法與畫法', () => {
  const RECTANGLE = chartDrawingOf(2, 'rectangle', [anchorOf(openTimeOf(10), '900'), anchorOf(openTimeOf(30), '700')]).toDomain().toDto()

  it('點在矩形裡面：選取它', async () => {
    const wrapper = mountLayer({ drawings: [RECTANGLE] })

    await press(wrapper, [200, 200])

    expect(wrapper.emitted('select')).toEqual([[2]])
  })

  it('拖選取中矩形的左下角：左邊與下邊跟著動', async () => {
    const wrapper = mountLayer({ drawings: [RECTANGLE], selectedDrawingId: 2 })

    await press(wrapper, [100, 300], [80, 350])

    const command = wrapper.emitted<[number, { anchors: ChartDrawingDto['anchors'] }]>('change')?.[0]?.[1]
    expect(command?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([[openTimeOf(8), '900'], [openTimeOf(30), '650']])
  })

  it.each([
    ['右上角', [300, 100], [320, 80], [[openTimeOf(10), '920'], [openTimeOf(32), '700']]],
    ['上邊的中點', [200, 100], [260, 60], [[openTimeOf(10), '940'], [openTimeOf(30), '700']]],
    ['下邊的中點', [200, 300], [260, 340], [[openTimeOf(10), '900'], [openTimeOf(30), '660']]],
    ['左邊的中點', [100, 200], [60, 260], [[openTimeOf(6), '900'], [openTimeOf(30), '700']]],
  ] as const)('拖選取中矩形的%s：只有那一角或那一邊動', async (_, from, to, expected) => {
    const wrapper = mountLayer({ drawings: [RECTANGLE], selectedDrawingId: 2 })

    await press(wrapper, [from[0], from[1]], [to[0], to[1]])

    const command = wrapper.emitted<[number, { anchors: ChartDrawingDto['anchors'] }]>('change')?.[0]?.[1]
    expect(command?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()])).toEqual(expected)
  })

  it('畫射線：從第一點穿過第二點', async () => {
    const wrapper = mountLayer({ activeDrawingKind: 'ray' })

    await press(wrapper, [100, 200], [200, 200])

    expect(finished(wrapper)?.kind).toBe('ray')
    expect(anchorsOf(finished(wrapper))).toEqual([[openTimeOf(10), '800'], [openTimeOf(20), '800']])
  })

  it('每一種都畫得出來，選取中與滑過的那一個帶把手，點游標畫一個點', async () => {
    const strokes: string[] = []
    const context = new Proxy({} as Record<string, unknown>, {
      get: (target, property: string) => {
        if (property === 'measureText') {
          return () => ({ width: 10 })
        }
        if (['stroke', 'strokeRect', 'fillRect', 'arc', 'fill'].includes(property)) {
          return () => strokes.push(property)
        }
        return property in target ? target[property] : () => {}
      },
      set: (target, property: string, value: unknown) => {
        target[property] = value
        return true
      },
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const realGetComputedStyle = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => Object.assign(realGetComputedStyle(element), {
      getPropertyValue: () => '#2962ff',
    }))
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const drawings = (['ray', 'horizontalRay', 'rectangle', 'trendLine'] as const).map((kind, index) =>
      chartDrawingOf(index + 1, kind, kind === 'horizontalRay'
        ? [anchorOf(openTimeOf(5), '850')]
        : [anchorOf(openTimeOf(10), '900'), anchorOf(openTimeOf(30), '700')]).toDomain().toDto())
    const wrapper = mountLayer({ drawings, selectedDrawingId: 3 })
    await wrapper.setProps({ cursorStyle: 'dot' })
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 200 }))
    await nextTick()
    frames.shift()?.(0)
    root(wrapper).dispatchEvent(new PointerEvent('pointerleave'))

    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    expect(strokes).toContain('strokeRect')
    expect(strokes.filter(stroke => stroke === 'arc').length).toBeGreaterThan(8)
  })
})
