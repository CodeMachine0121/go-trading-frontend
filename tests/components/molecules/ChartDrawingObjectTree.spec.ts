import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChartDrawingObjectTree from '~/components/molecules/ChartDrawingObjectTree.vue'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../../fixtures/chart-drawing'

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
