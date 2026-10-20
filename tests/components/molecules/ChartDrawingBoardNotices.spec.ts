import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChartDrawingBoardNotices from '~/components/molecules/ChartDrawingBoardNotices.vue'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const said = (text: string) => new LocalizedTextVo(text, text)

describe('繪圖與帳號的說明', () => {
  it('沒事時什麼都不說', () => {
    const wrapper = mount(ChartDrawingBoardNotices, { props: {} })

    expect(wrapper.text()).toBe('')
  })

  it.each([
    ['讀不到', 'loadFailure', 'retry-chart-drawing-load', 'retryLoad'],
    ['存不進去', 'saveFailure', 'retry-chart-drawing-save', 'retrySave'],
  ])('%s：說出原因，按重試交出', async (_, prop, button, event) => {
    const wrapper = mount(ChartDrawingBoardNotices, { props: { [prop]: said('原因在這裡') } })

    expect(wrapper.text()).toContain('原因在這裡')
    await wrapper.get(`[data-testid="${button}"]`).trigger('click')

    expect(wrapper.emitted(event)).toHaveLength(1)
  })

  it('舊繪圖沒搬成：只說明，沒有重試（下次打開會再試）', () => {
    const wrapper = mount(ChartDrawingBoardNotices, { props: { migrationFailure: said('沒搬成') } })

    expect(wrapper.get('[data-testid="chart-drawing-migration-failure"]').text()).toBe('沒搬成')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
