import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import KCandleChartWorkspace from '~/components/organisms/KCandleChartWorkspace.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import ChartDrawingLayer from '~/components/molecules/ChartDrawingLayer.vue'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import type { IChartDrawingBoardProxy } from '~/domain/interface/i-chart-drawing-board-proxy'
import { buildChartDrawingApplication, chartDrawingBoardProxyOf } from '../../fixtures/chart-drawing-application'
import { anchorOf, chartDrawingOf, horizontalLineAt, savedBoardOf } from '../../fixtures/chart-drawing'
import { KCandleSpec, kCandleChartOf } from '../../fixtures/k-candle-chart'
import { buildTimeZone } from '../../fixtures/time-zone'
import { buildKCandleContractProxy } from '../../fixtures/contract-proxies'
import { DEFAULT_AGGREGATION_INTERVAL_CHOICE } from '../../fixtures/aggregation-interval-choice'

const CHART = kCandleChartOf('1h', [
  new KCandleSpec('2026-10-16T10:00:00.000Z', '100', '112', '99', '110'),
  new KCandleSpec('2026-10-16T11:00:00.000Z', '108', '111', '104', '105'),
])
const HORIZONTAL_LINE = chartDrawingOf(1, 'horizontalLine', [anchorOf('2026-10-16T10:00:00.000Z', '105')])

let mounted: VueWrapper | null = null
afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.useRealTimers()
})

function mountWorkspace(options: {
  chart?: KCandleChartDto | null
  stored?: ChartDrawing[]
  boardProxy?: IChartDrawingBoardProxy
} = {}) {
  const boardProxy = options.boardProxy ?? chartDrawingBoardProxyOf(savedBoardOf(1, options.stored ?? []))
  mounted = mount(KCandleChartWorkspace, {
    attachTo: document.body,
    props: {
      chart: options.chart === undefined ? CHART : options.chart,
      timeZone: buildTimeZone(),
      marketSide: 'spot',
      symbol: 'BTCUSDT',
      legendTitle: 'BTCUSDT',
      intervalLabel: '一小時',
      presets: [],
      aggregationIntervalChoices: [DEFAULT_AGGREGATION_INTERVAL_CHOICE],
      activeAggregationIntervalChoice: DEFAULT_AGGREGATION_INTERVAL_CHOICE,
      drawing: 'candlestick',
      kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(
        { findKCandlesInRange: vi.fn(), findKCandleSeries: vi.fn(), saveKCandle: vi.fn(), updateKCandle: vi.fn(), deleteKCandle: vi.fn(), catchUpSymbol: vi.fn() },
        buildKCandleContractProxy())),
      chartDrawingApplication: buildChartDrawingApplication(boardProxy),
    },
    slots: {
      symbol: '<button data-testid="symbol-slot">BTCUSDT</button>',
      market: '<button data-testid="market-slot">現貨／合約</button>',
      empty: '<p data-testid="empty-slot">還沒有行情可以畫</p>',
      indicators: '<p data-testid="indicators-slot">指標清單</p>',
      notices: '<p data-testid="notice-slot">即時更新停了</p>',
    },
    global: { stubs: { KCandleChart: true } },
  })

  return mounted
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
}

const groupPressed = (wrapper: VueWrapper, group: string) =>
  wrapper.get(`[data-testid="drawing-tool-group-${group}"]`).attributes('aria-pressed')
const toast = (wrapper: VueWrapper) => wrapper.find('[data-testid="app-toast"]')

describe('KCandleChartWorkspace：版面', () => {
  it('四條細邊與圖都在：交易標的、刻度、繪圖工具、快捷區間、物件樹按鈕', () => {
    const wrapper = mountWorkspace()

    expect(wrapper.find('[data-testid="symbol-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="market-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="aggregation-interval-choice-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chart-drawing-toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="k-candle-chart-range-bar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="toggle-object-tree"]').exists()).toBe(true)
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it.each([
    ['一次都還沒取到', null],
    ['這一段查無 K 線', kCandleChartOf('1h', [])],
  ])('%s：圖的位置換成面板說的那一句', (_, chart) => {
    const wrapper = mountWorkspace({ chart })

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
    expect(wrapper.get('[data-testid="empty-slot"]').text()).toBe('還沒有行情可以畫')
  })

  it('狀態說明浮在圖上', () => {
    expect(mountWorkspace().get('[data-testid="notice-slot"]').text()).toBe('即時更新停了')
  })

  it('按主選單：交給頁面打開', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="open-workspace-menu"]').trigger('click')

    expect(wrapper.emitted('openMenu')).toHaveLength(1)
  })

  it('按指標：打開「指標與策略腳本」對話框，裡面是面板給的那一塊', async () => {
    const wrapper = mountWorkspace()
    expect(wrapper.find('[data-testid="indicators-slot"]').exists()).toBe(false)

    await wrapper.get('[data-testid="open-indicators"]').trigger('click')

    expect(wrapper.get('[data-testid="indicators-slot"]').text()).toBe('指標清單')
  })

  it('按物件樹：右側打開那一欄；再按一次收起', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()

    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)

    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    expect(wrapper.find('[data-testid="chart-drawing-object-tree"]').exists()).toBe(false)
  })
})

describe('KCandleChartWorkspace：圖回報的那幾件事', () => {
  it('十字線停在第 0 根：圖例說那一根', async () => {
    const wrapper = mountWorkspace()

    wrapper.findComponent(KCandleChart).vm.$emit('crosshairMove', 0)
    await flushPromises()

    expect(wrapper.get('[data-testid="legend-values"]').text()).toContain('收110')
  })

  it('最新那一根離開畫面：出現「跳到最新」，按下去交給面板', async () => {
    const wrapper = mountWorkspace()
    expect(wrapper.find('[data-testid="jump-to-latest"]').exists()).toBe(false)

    wrapper.findComponent(KCandleChart).vm.$emit('latestVisibilityChange', false)
    await flushPromises()
    await wrapper.get('[data-testid="jump-to-latest"]').trigger('click')

    expect(wrapper.emitted('jumpToLatest')).toHaveLength(1)
  })

  it('使用者拖了價格軸：下方細邊的「自動」不亮了', async () => {
    const wrapper = mountWorkspace()

    wrapper.findComponent(KCandleChart).vm.$emit('autoScaleChange', false)
    await flushPromises()

    expect(wrapper.get('[data-testid="auto-scale"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.findComponent(KCandleChart).props('autoScale')).toBe(false)
  })

  it('下方細邊換成對數：圖跟著換', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="logarithmic-scale"]').trigger('click')

    expect(wrapper.findComponent(KCandleChart).props('priceScaleMode')).toBe('logarithmic')
    expect(wrapper.get('[data-testid="logarithmic-scale"]').attributes('aria-pressed')).toBe('true')
  })

  it('換了畫法：交出去', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="drawing-menu-button"]').trigger('click')
    await wrapper.findAll('[data-testid="drawing-button"]')[1]?.trigger('click')

    expect(wrapper.emitted('update:drawing')).toEqual([['bar']])
  })
})

describe('KCandleChartWorkspace：繪圖', () => {
  it('移除所有：提示移除了幾個、可按上一步；上一步之後回來', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()

    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')
    expect(toast(wrapper).text()).toBe('已移除 1 個繪圖，可按上一步復原')

    await wrapper.get('[data-testid="undo-drawing"]').trigger('click')
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)
  })

  it('一個都沒有時移除所有：提示圖上沒有繪圖，上一步按不了', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')

    expect(toast(wrapper).text()).toBe('圖上沒有繪圖')
    expect(wrapper.get('[data-testid="undo-drawing"]').attributes('disabled')).toBeDefined()
  })

  it('提示過一會兒自己收掉', async () => {
    vi.useFakeTimers()
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')
    vi.advanceTimersByTime(3100)
    await flushPromises()

    expect(toast(wrapper).exists()).toBe(false)
  })

  it('從物件樹選取一個：浮動工具列出現；按線寬就換一級', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')

    await wrapper.get('[data-testid="object-tree-select"]').trigger('click')
    await wrapper.get('[data-testid="drawing-line-width"]').trigger('click')

    expect(wrapper.get('[data-testid="drawing-line-width"]').text()).toBe('2px')
  })

  it('從物件樹隱藏一個：那一列變成「顯示」；刪除一個：那一列消失', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')

    await wrapper.get('[data-testid="object-tree-toggle-visible"]').trigger('click')
    expect(wrapper.get('[data-testid="object-tree-toggle-visible"]').attributes('aria-label')).toBe('顯示')

    await wrapper.get('[data-testid="object-tree-remove"]').trigger('click')
    expect(wrapper.find('[data-testid="object-tree-row"]').exists()).toBe(false)
  })

  it('浮動工具列的刪除：那一個消失', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    await wrapper.get('[data-testid="object-tree-select"]').trigger('click')

    await wrapper.get('[data-testid="drawing-remove"]').trigger('click')

    expect(wrapper.find('[data-testid="object-tree-row"]').exists()).toBe(false)
  })

  it('開著隱藏所有：開關亮著', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="drawing-toggle-hideAllDrawings"]').trigger('click')

    expect(wrapper.get('[data-testid="drawing-toggle-hideAllDrawings"]').attributes('aria-pressed')).toBe('true')
  })

  it.each([
    ['magnet', '磁鐵模式已開啟：放點與拖動端點時，會吸到最近那根 K 線的開高低收', '磁鐵模式已關閉：點放在哪就是哪個價格'],
    ['stayInDrawingMode', '連續繪圖已開啟：畫完一個仍留在同一個工具，按 Esc 回到游標', '連續繪圖已關閉：畫完一個就回到游標'],
    ['lockAllDrawings', '已鎖定所有繪圖：仍可選取與刪除，但不會被拖動', '已解除鎖定：繪圖可以拖動與調整端點'],
    ['hideAllDrawings', '已隱藏所有繪圖', '已顯示所有繪圖'],
  ])('按 %s 開關：每次都說它現在會怎樣', async (name, turnedOn, turnedOff) => {
    const wrapper = mountWorkspace()
    const toggle = wrapper.get(`[data-testid="drawing-toggle-${name}"]`)

    await toggle.trigger('click')
    expect(toast(wrapper).text()).toBe(turnedOn)

    await toggle.trigger('click')
    expect(toast(wrapper).text()).toBe(turnedOff)
  })

  it('在手機上按鉛筆：叫出繪圖工具；選了一個工具就收起', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="toggle-drawing-tools"]').trigger('click')
    expect(wrapper.get('[data-testid="toggle-drawing-tools"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-testid="expand-drawing-tools-lines"]').trigger('click')
    await wrapper.get('[data-testid="drawing-tool-ray"]').trigger('click')
    expect(wrapper.get('[data-testid="toggle-drawing-tools"]').attributes('aria-pressed')).toBe('false')
  })
})

describe('KCandleChartWorkspace：快捷鍵', () => {
  it('⌥H 換成水平線；Esc 回到游標', async () => {
    const wrapper = mountWorkspace()

    press('˙', { code: 'KeyH', altKey: true })
    await flushPromises()
    expect(groupPressed(wrapper, 'lines')).toBe('true')

    press('Escape')
    await flushPromises()
    expect(groupPressed(wrapper, 'cursor')).toBe('true')
  })

  it('打一個英文字母：要打開商品搜尋並帶著它', () => {
    const wrapper = mountWorkspace()

    press('e')

    expect(wrapper.emitted('typeToSearch')).toEqual([['E']])
  })

  it('按著 ⌘ 打字母不算', () => {
    const wrapper = mountWorkspace()

    press('e', { metaKey: true })

    expect(wrapper.emitted('typeToSearch')).toBeUndefined()
  })

  it('正在輸入框裡打字：快捷鍵都不作用', () => {
    const wrapper = mountWorkspace()
    const input = document.createElement('input')
    document.body.appendChild(input)

    press('e', {}, input)
    press('˙', { code: 'KeyH', altKey: true }, input)

    expect(wrapper.emitted('typeToSearch')).toBeUndefined()
    expect(groupPressed(wrapper, 'cursor')).toBe('true')
    input.remove()
  })

  it('有繪圖選取著、正在搜尋框裡打字時按 Delete：刪的是字，那個繪圖還在', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    await wrapper.get('[data-testid="object-tree-select"]').trigger('click')
    const input = document.createElement('input')
    document.body.appendChild(input)

    press('Delete', {}, input)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)
    input.remove()
  })

  it('有對話框開著：快捷鍵都不作用', async () => {
    const wrapper = mountWorkspace()
    await wrapper.get('[data-testid="open-indicators"]').trigger('click')

    press('e')

    expect(wrapper.emitted('typeToSearch')).toBeUndefined()
  })

  it('Delete 刪除選取中的那一個；沒有選取時什麼都不做', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')

    press('Delete')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)

    await wrapper.get('[data-testid="object-tree-select"]').trigger('click')
    press('Backspace')
    await flushPromises()
    expect(wrapper.find('[data-testid="object-tree-row"]').exists()).toBe(false)
  })

  it.each([
    ['⌘Z 上一步、⌘⇧Z 下一步', [{ code: 'KeyZ', metaKey: true }, { code: 'KeyZ', metaKey: true, shiftKey: true }]],
    ['Ctrl+Z 上一步、Ctrl+Y 下一步', [{ code: 'KeyZ', ctrlKey: true }, { code: 'KeyY', ctrlKey: true }]],
  ] as const)('%s', async (_, [undoKey, redoKey]) => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')

    press('z', undoKey)
    await flushPromises()
    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)

    press('z', redoKey)
    await flushPromises()
    expect(wrapper.find('[data-testid="object-tree-row"]').exists()).toBe(false)
  })

  it('離開畫面之後不再聽鍵盤', () => {
    const wrapper = mountWorkspace()
    const emitted = wrapper.emitted.bind(wrapper)
    wrapper.unmount()
    mounted = null

    press('e')

    expect(emitted('typeToSearch')).toBeUndefined()
  })
})

describe('KCandleChartWorkspace：疊在圖上的繪圖層', () => {
  function mountWithLayer(stored: ChartDrawing[] = []) {
    mounted = mount(KCandleChartWorkspace, {
      attachTo: document.body,
      props: {
        chart: CHART,
        timeZone: buildTimeZone(),
        marketSide: 'spot',
        symbol: 'BTCUSDT',
        legendTitle: 'BTCUSDT',
        intervalLabel: '一小時',
        presets: [],
        aggregationIntervalChoices: [DEFAULT_AGGREGATION_INTERVAL_CHOICE],
        activeAggregationIntervalChoice: DEFAULT_AGGREGATION_INTERVAL_CHOICE,
        drawing: 'candlestick',
        kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(
          { findKCandlesInRange: vi.fn(), findKCandleSeries: vi.fn(), saveKCandle: vi.fn(), updateKCandle: vi.fn(), deleteKCandle: vi.fn(), catchUpSymbol: vi.fn() },
          buildKCandleContractProxy())),
        chartDrawingApplication: buildChartDrawingApplication(chartDrawingBoardProxyOf(savedBoardOf(1, stored))),
      },
      global: {
        stubs: {
          KCandleChart: { template: '<div><slot name="overlay" :coordinate-space="{}" /></div>' },
          ChartDrawingLayer: true,
        },
      },
    })

    return mounted
  }

  it('畫完一個：它被選取（浮動工具列出現）、物件樹多一列', async () => {
    const wrapper = mountWithLayer()
    const draft = buildChartDrawingApplication().draftDrawing('horizontalLine', [anchorOf('2026-10-16T10:00:00.000Z', '105')])

    wrapper.findComponent(ChartDrawingLayer).vm.$emit('finish', draft)
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')

    expect(wrapper.find('[data-testid="chart-drawing-floating-toolbar"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)
  })

  it('繪圖層說選了哪一個、拖完換了錨點：照著選取與修改', async () => {
    const wrapper = mountWithLayer([HORIZONTAL_LINE])
    await flushPromises()
    const layer = wrapper.findComponent(ChartDrawingLayer)

    layer.vm.$emit('select', 1)
    await flushPromises()
    expect(layer.props('selectedDrawingId')).toBe(1)

    layer.vm.$emit('change', 1, new ChartDrawingCommandDto('replaceAnchors', [anchorOf('2026-10-16T11:00:00.000Z', '108')]))
    await flushPromises()
    expect(layer.props('drawings')[0]?.anchors[0]?.price.toString()).toBe('108')
  })

  it('選了繪圖工具時游標一律是十字線', async () => {
    const wrapper = mountWithLayer()
    await wrapper.get('[data-testid="expand-drawing-tools-cursor"]').trigger('click')
    await wrapper.get('[data-testid="drawing-tool-arrow"]').trigger('click')

    await wrapper.get('[data-testid="drawing-tool-group-lines"]').trigger('click')

    expect(wrapper.findComponent(ChartDrawingLayer).props('activeDrawingKind')).toBe('trendLine')
    expect(wrapper.findComponent(ChartDrawingLayer).props('cursorStyle')).toBe('arrow')
  })
})

describe('KCandleChartWorkspace：其餘的接線', () => {
  it('指標對話框按關閉就收起', async () => {
    const wrapper = mountWorkspace()
    await wrapper.get('[data-testid="open-indicators"]').trigger('click')

    await wrapper.get('[aria-modal="true"] button[aria-label="關閉"]').trigger('click')

    expect(wrapper.find('[data-testid="indicators-slot"]').exists()).toBe(false)
  })

  it('物件樹按關閉就收起', async () => {
    const wrapper = mountWorkspace()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')

    await wrapper.get('[data-testid="close-object-tree"]').trigger('click')

    expect(wrapper.find('[data-testid="chart-drawing-object-tree"]').exists()).toBe(false)
  })

  it('連著兩次提示：說的是後面那一句', async () => {
    const wrapper = mountWorkspace({ stored: [HORIZONTAL_LINE] })
    await flushPromises()

    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')
    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')

    expect(toast(wrapper).text()).toBe('圖上沒有繪圖')
  })

  it('下方細邊按「自動」：圖跟著關掉自動縮放', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-testid="auto-scale"]').trigger('click')

    expect(wrapper.findComponent(KCandleChart).props('autoScale')).toBe(false)
  })
})

describe('KCandleChartWorkspace：成交量疊圖', () => {
  it('一進來成交量是開的；在圖例上收起來，圖上那一條跟著藏起來；再按一次回來', async () => {
    const wrapper = mountWorkspace()
    expect(wrapper.findComponent(KCandleChart).props('showsVolume')).toBe(true)

    await wrapper.get('[data-testid="legend-toggle-volume"]').trigger('click')
    expect(wrapper.findComponent(KCandleChart).props('showsVolume')).toBe(false)

    await wrapper.get('[data-testid="legend-toggle-volume"]').trigger('click')
    expect(wrapper.findComponent(KCandleChart).props('showsVolume')).toBe(true)
  })

  it('十字線停在第 0 根：Vol 那一行寫那一根的量', async () => {
    const wrapper = mountWorkspace()

    wrapper.findComponent(KCandleChart).vm.$emit('crosshairMove', 0)
    await flushPromises()

    expect(wrapper.get('[data-testid="legend-volume-value"]').text()).toBe('1')
  })
})

describe('KCandleChartWorkspace：帳號裡的繪圖', () => {
  it('站內助手答完一則（重讀訊號變了）：重讀，助手畫的線出現在物件樹並標出', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(1, []))
    const wrapper = mountWorkspace({ boardProxy })
    await flushPromises()
    vi.mocked(boardProxy.fetchBoard).mockResolvedValue(savedBoardOf(2, [horizontalLineAt(9, '58000', 'assistant')]))

    await wrapper.setProps({ drawingBoardRefreshSignal: 1 })
    await flushPromises()
    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')

    expect(wrapper.get('[data-testid="object-tree-drawn-by-assistant"]').text()).toBe('助手畫的')
  })

  it('讀不到帳號裡的繪圖：圖上說明；重試成功後說明消失', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(1, []))
    vi.mocked(boardProxy.fetchBoard).mockRejectedValueOnce(new Error('連不上'))
    const wrapper = mountWorkspace({ boardProxy })
    await flushPromises()

    expect(wrapper.get('[data-testid="chart-drawing-load-failure"]').text()).toContain('讀不到存在帳號裡的繪圖')

    await wrapper.get('[data-testid="retry-chart-drawing-load"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="chart-drawing-load-failure"]').exists()).toBe(false)
  })

  it('物件樹按「移除助手畫的全部」並確認：提示移除了幾個，助手畫的不見了', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(1, [HORIZONTAL_LINE, horizontalLineAt(9, '58000', 'assistant')]))
    const wrapper = mountWorkspace({ boardProxy })
    await flushPromises()
    vi.mocked(boardProxy.removeAssistantDrawings).mockResolvedValue(1)
    vi.mocked(boardProxy.fetchBoard).mockResolvedValue(savedBoardOf(2, [HORIZONTAL_LINE]))

    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    await wrapper.get('[data-testid="remove-assistant-drawings"]').trigger('click')
    await wrapper.get('[data-testid="confirm-remove-assistant-drawings"]').trigger('click')
    await flushPromises()

    expect(toast(wrapper).text()).toBe('已移除 1 個助手畫的繪圖')
    expect(wrapper.findAll('[data-testid="object-tree-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="remove-assistant-drawings"]').exists()).toBe(false)
  })

  it('物件樹按「移除助手畫的全部」、確認時取消：助手畫的那一條還在，帳號沒被動', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(1, [horizontalLineAt(9, '58000', 'assistant')]))
    const wrapper = mountWorkspace({ boardProxy })
    await flushPromises()

    await wrapper.get('[data-testid="toggle-object-tree"]').trigger('click')
    await wrapper.get('[data-testid="remove-assistant-drawings"]').trigger('click')
    await wrapper.get('[data-testid="cancel-remove-assistant-drawings"]').trigger('click')
    await flushPromises()

    expect(boardProxy.removeAssistantDrawings).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="object-tree-drawn-by-assistant"]')).toHaveLength(1)
  })
})
