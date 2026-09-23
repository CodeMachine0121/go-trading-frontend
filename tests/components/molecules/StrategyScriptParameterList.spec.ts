import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyScriptParameterList from '~/components/molecules/StrategyScriptParameterList.vue'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { StrategyScriptParameterFieldDto } from '~/domain/models/dto/strategy-script-parameter-field-dto'

const KIND_OPTIONS = [{ value: 'lookbackCount' as const, label: '回看根數' }]

function mountList(readonly: boolean) {
  return mount(StrategyScriptParameterList, {
    props: {
      fields: [new StrategyScriptParameterFieldDto(
        new StrategyScriptParameterDto('週期', 'lookbackCount', 20), 'number', [], 'numeric', 1, false)],
      kindOptions: KIND_OPTIONS,
      readonly,
    },
  })
}

describe('StrategyScriptParameterList', () => {
  it('唯讀時每一格照樣看得到，但名稱、種類、預設值都改不動', () => {
    const wrapper = mountList(true)

    const name = wrapper.get<HTMLInputElement>('[data-testid="parameter-name-input"]')
    const value = wrapper.get<HTMLInputElement>('[data-testid="parameter-value-input"]')
    expect(name.element.value).toBe('週期')
    expect(value.element.value).toBe('20')
    expect(name.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="parameter-kind-select"]').attributes('disabled')).toBeDefined()
    expect(value.attributes('disabled')).toBeDefined()
  })

  it('唯讀時沒有新增、也沒有移除', () => {
    const wrapper = mountList(true)

    expect(wrapper.find('[data-testid="add-parameter-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="remove-parameter-0"]').exists()).toBe(false)
  })

  it('不是唯讀時新增與移除照舊都在，每一格也改得動', () => {
    const wrapper = mountList(false)

    expect(wrapper.find('[data-testid="add-parameter-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="remove-parameter-0"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="parameter-name-input"]').attributes('disabled')).toBeUndefined()
  })

  it.each([
    { readonly: true, says: '這支策略腳本沒有可調的東西。' },
    { readonly: false, says: '這支算式沒有可調的東西。加一個之後，算式就能用它的名字取用它。' },
  ])('一個都沒有、readonly = $readonly 時說「$says」', ({ readonly, says }) => {
    const wrapper = mount(StrategyScriptParameterList, {
      props: { fields: [], kindOptions: KIND_OPTIONS, readonly },
    })

    expect(wrapper.get('[data-testid="parameters-empty"]').text()).toBe(says)
  })
})
