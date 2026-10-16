import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ChartDrawingFloatingToolbar from '~/components/molecules/ChartDrawingFloatingToolbar.vue'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../../fixtures/chart-drawing'

const trendLine = (locked = false) => chartDrawingOf(1, 'trendLine',
  [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')], locked, 2, 'dashed').toDomain().toDto()

describe('浮動工具列', () => {
  it('能改樣式的繪圖：線色、線寬、線型、鎖定、刪除都在', () => {
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing: trendLine() } })

    expect(wrapper.get('[data-testid="drawing-line-width"]').text()).toBe('2px')
    expect(wrapper.get('[data-testid="drawing-line-style"]').text()).toBe('虛線')
    expect(wrapper.find('[data-testid="drawing-line-color"]').exists()).toBe(true)
  })

  it.each(['fibonacciRetracement', 'dateAndPriceRange'] as const)('%s 用固定配色：沒有線色、線寬、線型', (kind) => {
    const drawing = chartDrawingOf(1, kind, [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]).toDomain().toDto()
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing } })

    expect(wrapper.find('[data-testid="drawing-line-color"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="drawing-line-width"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="drawing-line-style"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="drawing-lock"]').exists()).toBe(true)
  })

  it.each([
    ['drawing-line-width', 'cycleLineWidth'],
    ['drawing-line-style', 'cycleLineStyle'],
    ['drawing-lock', 'toggleLocked'],
  ])('按 %s 交出 %s', async (button, commandKind) => {
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing: trendLine() } })

    await wrapper.get(`[data-testid="${button}"]`).trigger('click')

    expect(wrapper.emitted('command')?.[0]?.[0]).toMatchObject({ kind: commandKind })
  })

  it('打開調色盤挑紅色：交出換色、調色盤收起來', async () => {
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing: trendLine() } })

    await wrapper.get('[data-testid="drawing-line-color"]').trigger('click')
    expect(wrapper.get('[data-testid="drawing-color---color-drawing-blue"]').attributes('aria-selected')).toBe('true')
    await wrapper.get('[data-testid="drawing-color---color-drawing-red"]').trigger('click')

    expect(wrapper.emitted('command')?.[0]?.[0]).toMatchObject({ kind: 'changeColor', colorToken: '--color-drawing-red' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('鎖定的繪圖：鎖頭是按下的、說的是解除鎖定', () => {
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing: trendLine(true) } })

    expect(wrapper.get('[data-testid="drawing-lock"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="drawing-lock"]').attributes('aria-label')).toBe('解除鎖定')
  })

  it('按刪除', async () => {
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing: trendLine() } })

    await wrapper.get('[data-testid="drawing-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})

describe('浮動工具列：拖到別處', () => {
  it('拖左端的把手：工具列停在放手的地方，不再置中', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(ChartDrawingFloatingToolbar, { props: { drawing: trendLine() }, attachTo: host })
    vi.spyOn(wrapper.element.parentElement as HTMLElement, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 0, width: 800, height: 600 }))
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 300, y: 10, width: 200, height: 36 }))

    await wrapper.get('button').trigger('pointerdown', { clientX: 305, clientY: 20 })
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 105, clientY: 120 }))
    window.dispatchEvent(new PointerEvent('pointerup'))
    await nextTick()

    expect((wrapper.element as HTMLElement).style.left).toBe('100px')
    expect((wrapper.element as HTMLElement).style.top).toBe('110px')
    wrapper.unmount()
    host.remove()
  })
})
