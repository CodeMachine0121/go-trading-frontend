import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyLibraryDialog from '~/components/molecules/StrategyLibraryDialog.vue'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'

function strategyOf(id: number, name: string): StrategyDto {
  return new StrategyDto(
    id, name, new StrategyContentDto('sum := 0.0', 'floatList'), true, true)
}

function mountLibrary(props: Record<string, unknown> = {}) {
  return mount(StrategyLibraryDialog, { props: { open: true, strategies: [], ...props } })
}

describe('StrategyLibraryDialog', () => {
  it('每一支一列，順序照給的來', () => {
    const wrapper = mountLibrary({
      strategies: [strategyOf(1, '二十根均線'), strategyOf(2, '六十根均線'), strategyOf(3, 'RSI14')],
    })

    const rows = wrapper.findAll('[data-testid="strategy-library-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0]?.text()).toContain('二十根均線')
    expect(rows[2]?.text()).toContain('RSI14')
  })

  it('每一列都能載入也能刪除', () => {
    const wrapper = mountLibrary({ strategies: [strategyOf(7, '二十根均線')] })

    expect(wrapper.find('[data-testid="strategy-library-load-7"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strategy-library-delete-7"]').exists()).toBe(true)
  })

  it('按載入時說出載入的是哪一支', async () => {
    const wrapper = mountLibrary({ strategies: [strategyOf(7, '二十根均線')] })

    await wrapper.get('[data-testid="strategy-library-load-7"]').trigger('click')

    expect(wrapper.emitted('load')).toEqual([[7]])
  })

  it('按刪除時說出要刪的是哪一支，而且不當成載入', async () => {
    const wrapper = mountLibrary({ strategies: [strategyOf(7, '二十根均線')] })

    await wrapper.get('[data-testid="strategy-library-delete-7"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[7]])
    expect(wrapper.emitted('load')).toBeUndefined()
  })

  it('標出目前使用中的是哪一支', () => {
    const wrapper = mountLibrary({
      strategies: [strategyOf(1, '二十根均線'), strategyOf(2, '六十根均線')],
      activeStrategyId: 2,
    })

    const rows = wrapper.findAll('[data-testid="strategy-library-row"]')
    expect(rows[0]?.text()).not.toContain('使用中')
    expect(rows[1]?.text()).toContain('使用中')
  })

  it('一支都沒有時明說沒有', () => {
    const wrapper = mountLibrary({ strategies: [] })

    expect(wrapper.get('[data-testid="strategy-library-empty"]').text()).toBe('還沒有任何策略。')
  })

  it('連不上後端時說連不上，不呈現空清單的說法', () => {
    // 把連線失敗顯示成空清單，會讓人以為自己什麼都沒存過。
    const wrapper = mountLibrary({ strategies: [], errorMessage: '連不上後端' })

    expect(wrapper.get('[data-testid="strategy-library-error"]').text()).toBe('連不上後端')
    expect(wrapper.find('[data-testid="strategy-library-empty"]').exists()).toBe(false)
  })

  it('關掉清單就是關掉', async () => {
    const wrapper = mountLibrary()

    await wrapper.get('.app-modal__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
