import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyLibraryDialog from '~/components/molecules/StrategyLibraryDialog.vue'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'

function strategyOf(id: number, name: string): StrategyDto {
  return new StrategyDto(
    id, name, '', new StrategyContentDto('sum := 0.0', 'floatList'), true, true, false)
}

function mountLibrary(props: Record<string, unknown> = {}) {
  return mount(StrategyLibraryDialog, {
    props: { open: true, strategies: [], adoptedStrategies: [], ...props },
  })
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

    expect(wrapper.get('[data-testid="strategy-library-empty"]').text())
      .toContain('還沒有任何策略')
    // 另一半同樣重要：一句「沒有」不告訴人下一步，而這一頁的下一步是去市集看看。
    expect(wrapper.get('[data-testid="strategy-library-empty"]').text()).toContain('市集')
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

/** 一支從市集加入來的策略。**它沒有算式**——那不是漏了，是那一欄不存在。 */
function adoptedStrategyOf(id: number, name: string): PublishedStrategyDto {
  return new PublishedStrategyDto(
    id, name, '抓短線轉折', 'floatList', 'someone@example.com',
    new Date('2026-09-10T08:00:00.000Z'), [], true, '一串數字')
}

describe('StrategyLibraryDialog：兩段清單', () => {
  it('自己的與加入的分成兩節，各有小標題', () => {
    const wrapper = mountLibrary({
      strategies: [strategyOf(1, '我的')],
      adoptedStrategies: [adoptedStrategyOf(9, '別人的')],
    })

    expect(wrapper.text()).toContain('我的策略')
    expect(wrapper.get('[data-testid="strategy-library-adopted-section"]').text())
      .toContain('我加入的')
  })

  it('加入來的那一列只有「移除」，一個會改動它的動作都沒有', () => {
    // 它沒有算式可以載，也不是我的東西——顯示那些按鈕，按下去只會撞牆。
    const wrapper = mountLibrary({
      strategies: [],
      adoptedStrategies: [adoptedStrategyOf(9, '別人的')],
    })

    expect(wrapper.find('[data-testid="strategy-library-abandon-9"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strategy-library-load-9"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="strategy-library-delete-9"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="strategy-library-publish-9"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="strategy-library-withdraw-9"]').exists()).toBe(false)
  })

  it('加入來的那一列標出是誰分享的', () => {
    const wrapper = mountLibrary({
      strategies: [],
      adoptedStrategies: [adoptedStrategyOf(9, '別人的')],
    })

    expect(wrapper.get('[data-testid="strategy-library-adopted-row-9"]').text())
      .toContain('someone@example.com')
  })

  it('按移除時說出是哪一支', async () => {
    const wrapper = mountLibrary({
      strategies: [],
      adoptedStrategies: [adoptedStrategyOf(9, '別人的')],
    })

    await wrapper.get('[data-testid="strategy-library-abandon-9"]').trigger('click')

    expect(wrapper.emitted('abandon')).toEqual([[9]])
  })

  it('兩段都空才說「還沒有任何策略」', () => {
    const wrapper = mountLibrary({
      strategies: [],
      adoptedStrategies: [adoptedStrategyOf(9, '別人的')],
    })

    expect(wrapper.find('[data-testid="strategy-library-empty"]').exists()).toBe(false)
  })
})

describe('StrategyLibraryDialog：分享與收回', () => {
  it('沒分享過的那一支給的是「分享」', () => {
    const wrapper = mountLibrary({ strategies: [strategyOf(1, '我的')] })

    expect(wrapper.find('[data-testid="strategy-library-publish-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strategy-library-withdraw-1"]').exists()).toBe(false)
  })

  it('分享過的那一支給的是「收回」', () => {
    // 兩顆並排會有一顆永遠按不動，而看的人得自己判斷是哪一顆。
    const wrapper = mountLibrary({ strategies: [publishedStrategyOf(1, '我的')] })

    expect(wrapper.find('[data-testid="strategy-library-withdraw-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strategy-library-publish-1"]').exists()).toBe(false)
  })

  it('按分享與按收回都說出是哪一支', async () => {
    const wrapper = mountLibrary({
      strategies: [strategyOf(1, '沒分享的'), publishedStrategyOf(2, '分享過的')],
    })

    await wrapper.get('[data-testid="strategy-library-publish-1"]').trigger('click')
    await wrapper.get('[data-testid="strategy-library-withdraw-2"]').trigger('click')

    expect(wrapper.emitted('publish')).toEqual([[1]])
    expect(wrapper.emitted('withdraw')).toEqual([[2]])
  })
})

/** 自己的一支，已經分享到市集上。 */
function publishedStrategyOf(id: number, name: string): StrategyDto {
  return new StrategyDto(
    id, name, '', new StrategyContentDto('sum := 0.0', 'floatList'), true, true, true)
}
