import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChartDrawingObjectTree from '~/components/molecules/ChartDrawingObjectTree.vue'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf, horizontalLineAt } from '../../fixtures/chart-drawing'

const TREND_LINE = chartDrawingOf(1, 'trendLine', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')]).toDomain().toDto()
const HIDDEN_RECTANGLE = new ChartDrawing(2, 'rectangle', [anchorOf(TEN_O_CLOCK, '1'), anchorOf(ELEVEN_O_CLOCK, '2')],
  '--color-drawing-purple', 1, 'solid', true, false).toDomain().toDto()

describe('物件樹', () => {
  it('沒有繪圖：說圖上還沒有繪圖、怎麼畫第一個', () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [] } })

    expect(wrapper.get('[data-testid="object-tree-empty"]').text()).toContain('圖上還沒有繪圖')
  })

  it('新畫的在上', () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [TREND_LINE, HIDDEN_RECTANGLE] } })

    expect(wrapper.findAll('[data-testid="object-tree-select"]').map(row => row.text())).toEqual(['矩形', '趨勢線'])
  })

  it('隱藏中的那一列，按鈕說的是顯示', () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [TREND_LINE, HIDDEN_RECTANGLE] } })

    expect(wrapper.findAll('[data-testid="object-tree-toggle-visible"]').map(button => button.attributes('aria-label')))
      .toEqual(['顯示', '隱藏'])
  })

  it.each([
    ['object-tree-select', 'select'],
    ['object-tree-toggle-visible', 'toggleVisible'],
    ['object-tree-remove', 'remove'],
  ])('按 %s 交出那一列的繪圖', async (button, event) => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [TREND_LINE, HIDDEN_RECTANGLE] } })

    await wrapper.findAll(`[data-testid="${button}"]`)[1]?.trigger('click')

    expect(wrapper.emitted(event)).toEqual([[1]])
  })

  it('按關閉', async () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [] } })

    await wrapper.get('[data-testid="close-object-tree"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

const ASSISTANT_LINE = horizontalLineAt(9, '58000', 'assistant').toDomain().toDto()

describe('物件樹：助手畫的', () => {
  it('助手畫的那一列標「助手畫的」，手畫的沒有', () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [TREND_LINE, ASSISTANT_LINE], assistantDrawingCount: 1 } })

    const rows = wrapper.findAll('[data-testid="object-tree-row"]')
    expect(rows[0]?.find('[data-testid="object-tree-drawn-by-assistant"]').text()).toBe('助手畫的')
    expect(rows[1]?.find('[data-testid="object-tree-drawn-by-assistant"]').exists()).toBe(false)
  })

  it('沒有助手畫的繪圖：沒有「移除助手畫的全部」', () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [TREND_LINE], assistantDrawingCount: 0 } })

    expect(wrapper.find('[data-testid="remove-assistant-drawings"]').exists()).toBe(false)
  })

  it('按「移除助手畫的全部」先問一次，確認才交出', async () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [TREND_LINE, ASSISTANT_LINE], assistantDrawingCount: 2 } })

    await wrapper.get('[data-testid="remove-assistant-drawings"]').trigger('click')
    expect(wrapper.text()).toContain('確定移除 2 個助手畫的繪圖？')
    expect(wrapper.emitted('removeAssistantDrawings')).toBeUndefined()

    await wrapper.get('[data-testid="confirm-remove-assistant-drawings"]').trigger('click')
    expect(wrapper.emitted('removeAssistantDrawings')).toHaveLength(1)
  })

  it('確認時按取消：什麼都不交出，回到原本的按鈕', async () => {
    const wrapper = mount(ChartDrawingObjectTree, { props: { drawings: [ASSISTANT_LINE], assistantDrawingCount: 1 } })

    await wrapper.get('[data-testid="remove-assistant-drawings"]').trigger('click')
    await wrapper.get('[data-testid="cancel-remove-assistant-drawings"]').trigger('click')

    expect(wrapper.emitted('removeAssistantDrawings')).toBeUndefined()
    expect(wrapper.find('[data-testid="remove-assistant-drawings"]').text()).toBe('移除助手畫的全部（1）')
  })
})
