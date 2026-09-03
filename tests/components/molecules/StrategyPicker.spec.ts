import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyPicker from '~/components/molecules/StrategyPicker.vue'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'

function strategyOf(id: number, name: string): StrategyDto {
  return new StrategyDto(
    id, name, new StrategyContentDto('sum := 0.0', 'floatList'), true, true)
}

describe('StrategyPicker', () => {
  it('一支都沒有時說出來，而不是給一個空選單', () => {
    // 空選單看起來像壞掉；一句話才說得出真正發生的事。
    const wrapper = mount(StrategyPicker, { props: { strategies: [] } })

    expect(wrapper.get('[data-testid="strategy-picker-empty"]').text())
      .toContain('還沒有任何策略')
    expect(wrapper.find('[data-testid="strategy-picker-select"]').exists()).toBe(false)
  })

  it('每一支都在選單上', () => {
    const wrapper = mount(StrategyPicker, {
      props: { strategies: [strategyOf(1, '二十根均線'), strategyOf(2, '六十根均線')] },
    })

    const optionTexts = wrapper.findAll('option').map(option => option.text())
    expect(optionTexts).toContain('二十根均線')
    expect(optionTexts).toContain('六十根均線')
  })

  it('選單顯示的是目前使用中的那一支', () => {
    const wrapper = mount(StrategyPicker, {
      props: {
        strategies: [strategyOf(1, '二十根均線'), strategyOf(2, '六十根均線')],
        activeStrategyId: 2,
      },
    })

    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('2')
  })

  it('沒有使用中的那一支時顯示的是沒有', () => {
    const wrapper = mount(StrategyPicker, {
      props: { strategies: [strategyOf(1, '二十根均線')], activeStrategyId: null },
    })

    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('')
  })

  it('挑了一支就說出挑的是哪一支', async () => {
    const wrapper = mount(StrategyPicker, {
      props: { strategies: [strategyOf(1, '二十根均線'), strategyOf(2, '六十根均線')] },
    })

    await wrapper.get('select').setValue('2')

    expect(wrapper.emitted('select')).toEqual([[2]])
  })

  it('動作與選單同一列，且不在標籤裡面', async () => {
    // 標籤包住動作的話，點動作會被瀏覽器轉給標籤包住的第一個控制項——
    // 按「策略清單」會變成按到「儲存」。這一條就是為了擋住那個。
    const wrapper = mount(StrategyPicker, {
      props: { strategies: [strategyOf(1, '二十根均線')] },
      slots: { actions: '<button data-testid="an-action">動作</button>' },
    })

    expect(wrapper.get('label').find('[data-testid="an-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="an-action"]').exists()).toBe(true)
  })

  it('一支都沒有時動作仍然在——那正是要存下第一支的時候', () => {
    const wrapper = mount(StrategyPicker, {
      props: { strategies: [] },
      slots: { actions: '<button data-testid="an-action">動作</button>' },
    })

    expect(wrapper.find('[data-testid="strategy-picker-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="an-action"]').exists()).toBe(true)
  })

  it('說明跟著有沒有策略換一句話', () => {
    const withNone = mount(StrategyPicker, { props: { strategies: [] } })
    const withSome = mount(StrategyPicker, { props: { strategies: [strategyOf(1, 'x')] } })

    expect(withNone.text()).toContain('按「另存為新策略」就會留下第一支')
    expect(withSome.text()).toContain('挑一支會把它的算式')
  })

  it('挑回「未使用任何策略」不算挑了一支', async () => {
    // 那不是一支策略，把它當成挑了東西會去載入一支不存在的策略。
    const wrapper = mount(StrategyPicker, {
      props: { strategies: [strategyOf(1, '二十根均線')], activeStrategyId: 1 },
    })

    await wrapper.get('select').setValue('')

    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
