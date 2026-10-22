import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ChartDrawingToolbar from '~/components/molecules/ChartDrawingToolbar.vue'
import { buildChartDrawingApplication } from '../../fixtures/chart-drawing-application'

const TOOL_GROUPS = buildChartDrawingApplication().listToolGroups()
const REMEMBERED = { cursor: 'cross', lines: 'trendLine', fibonacci: 'fibonacciRetracement', shapes: 'rectangle', measure: 'dateAndPriceRange' } as const
const TOGGLES = { magnet: false, stayInDrawingMode: true, lockAllDrawings: false, hideAllDrawings: false }

const isExpanded = (wrapper: ReturnType<typeof mountToolbar>) => wrapper.find('[role="menu"]').exists()

function mountToolbar(overrides: { activeDrawingKind?: 'trendLine' | 'verticalLine' | null, rememberedLines?: 'trendLine' | 'verticalLine', attachTo?: HTMLElement } = {}) {
  return mount(ChartDrawingToolbar, {
    attachTo: overrides.attachTo,
    props: {
      toolGroups: TOOL_GROUPS,
      rememberedTools: { ...REMEMBERED, lines: overrides.rememberedLines ?? 'trendLine' },
      activeDrawingKind: overrides.activeDrawingKind ?? null,
      cursorStyle: 'cross',
      toggles: TOGGLES,
    },
  })
}

describe('左邊細邊：工具格', () => {
  it('五格依序排開，每一格顯示它記得的那一個', () => {
    const wrapper = mountToolbar({ rememberedLines: 'verticalLine' })

    expect(['cursor', 'lines', 'fibonacci', 'shapes', 'measure']
      .map(group => wrapper.get(`[data-testid="drawing-tool-group-${group}"]`).attributes('aria-label')))
      .toEqual(['十字線', '垂直線 (⌥V)', '斐波那契回撤 (⌥F)', '矩形 (⌥⇧R)', '日期與價格範圍'])
  })

  it('沒有繪圖工具時是游標那一格亮著', () => {
    const wrapper = mountToolbar()

    expect(wrapper.get('[data-testid="drawing-tool-group-cursor"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="drawing-tool-group-lines"]').attributes('aria-pressed')).toBe('false')
  })

  it('正在用的那一格亮著', () => {
    const wrapper = mountToolbar({ activeDrawingKind: 'trendLine' })

    expect(wrapper.get('[data-testid="drawing-tool-group-lines"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="drawing-tool-group-cursor"]').attributes('aria-pressed')).toBe('false')
  })

  it('按一格的主按鈕：交出是哪一格', async () => {
    const wrapper = mountToolbar()

    await wrapper.get('[data-testid="drawing-tool-group-shapes"]').trigger('click')

    expect(wrapper.emitted('pressGroup')).toEqual([['shapes']])
  })

  it('只有一種工具的格子沒有展開箭頭', () => {
    const wrapper = mountToolbar()

    expect(wrapper.find('[data-testid="expand-drawing-tools-lines"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expand-drawing-tools-shapes"]').exists()).toBe(false)
  })

  it('展開「線」那一格列出五種與各自的快捷鍵，挑一個就交出去並收起來', async () => {
    const wrapper = mountToolbar()

    await wrapper.get('[data-testid="expand-drawing-tools-lines"]').trigger('click')
    expect(wrapper.findAll('[role="menuitem"]').map(item => item.text()))
      .toEqual(['趨勢線⌥T', '射線', '水平線⌥H', '水平射線⌥J', '垂直線⌥V'])

    await wrapper.get('[data-testid="drawing-tool-verticalLine"]').trigger('click')

    expect(wrapper.emitted('pickTool')).toEqual([['verticalLine']])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})

describe('左邊細邊：展開的那一列怎麼收起來', () => {
  it.each([
    ['按圖上別的地方', () => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))],
    ['按 Esc', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ['視窗改了大小', () => window.dispatchEvent(new Event('resize'))],
  ])('%s就收起來', async (_, collapseBy) => {
    const wrapper = mountToolbar()
    await wrapper.get('[data-testid="expand-drawing-tools-lines"]').trigger('click')

    collapseBy()
    await nextTick()

    expect(isExpanded(wrapper)).toBe(false)
  })

  it('按同一格的箭頭第二次就收起來', async () => {
    const wrapper = mountToolbar()
    const expand = wrapper.get('[data-testid="expand-drawing-tools-lines"]')

    await expand.trigger('click')
    await expand.trigger('click')

    expect(isExpanded(wrapper)).toBe(false)
  })

  it('在展開的那一列裡按下去不會收起來', async () => {
    const wrapper = mountToolbar({ attachTo: document.body })
    await wrapper.get('[data-testid="expand-drawing-tools-lines"]').trigger('click')

    wrapper.get('[data-testid="drawing-tool-ray"]').element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()

    expect(isExpanded(wrapper)).toBe(true)
    wrapper.unmount()
  })
})

describe('左邊細邊：開關與移除所有', () => {
  it('開關的亮與不亮照它現在的狀態', () => {
    const wrapper = mountToolbar()

    expect(wrapper.get('[data-testid="drawing-toggle-stayInDrawingMode"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="drawing-toggle-magnet"]').attributes('aria-pressed')).toBe('false')
  })

  it.each(['magnet', 'stayInDrawingMode', 'lockAllDrawings', 'hideAllDrawings'])('按 %s 就交出它', async (toggle) => {
    const wrapper = mountToolbar()

    await wrapper.get(`[data-testid="drawing-toggle-${toggle}"]`).trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([[toggle]])
  })

  it('按移除所有繪圖', async () => {
    const wrapper = mountToolbar()

    await wrapper.get('[data-testid="remove-all-drawings"]').trigger('click')

    expect(wrapper.emitted('removeAll')).toHaveLength(1)
  })
})
