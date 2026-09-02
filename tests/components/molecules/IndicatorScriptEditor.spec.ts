import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'
import { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'

const TEMPLATE = new IndicatorScriptTemplateDto(
  'package main\n\nfunc Calculate(data []indicator.KCandle) map[string]float64 {',
  '}',
  'return map[string]float64{"均價": 110}')

async function mountEditor(overrides: { errorMessage?: string | null } = {}) {
  const wrapper = mount(IndicatorScriptEditor, {
    props: { scriptTemplate: TEMPLATE, modelValue: 'sum := 0.0', ...overrides },
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()

  return wrapper
}

describe('IndicatorScriptEditor', () => {
  it('外框的頭尾都看得到，使用者知道自己寫的內容被放進哪裡', async () => {
    const wrapper = await mountEditor()

    expect(wrapper.get('[data-testid="script-frame-header"]').text())
      .toContain('func Calculate(data []indicator.KCandle) map[string]float64 {')
    expect(wrapper.get('[data-testid="script-frame-footer"]').text()).toBe('}')
  })

  it('外框改不動——它不是輸入欄位', async () => {
    const wrapper = await mountEditor()

    expect(wrapper.get('[data-testid="script-frame-header"]').attributes('contenteditable'))
      .toBeUndefined()
    expect(wrapper.find('[data-testid="script-frame-header"] input').exists()).toBe(false)
  })

  it('外框跟著換掉的樣板走', async () => {
    const wrapper = await mountEditor()

    await wrapper.setProps({
      scriptTemplate: new IndicatorScriptTemplateDto(
        'func Calculate(data []indicator.KCandle) map[string][]bool {', '}', 'return nil'),
    })

    expect(wrapper.get('[data-testid="script-frame-header"]').text()).toContain('map[string][]bool')
  })

  it('內容出錯時把訊息標在算式旁邊', async () => {
    const wrapper = await mountEditor({ errorMessage: '請填寫算式內容' })

    expect(wrapper.get('[data-testid="script-body-error"]').text()).toBe('請填寫算式內容')
  })

  it('沒有錯誤時不擺錯誤訊息', async () => {
    const wrapper = await mountEditor()

    expect(wrapper.find('[data-testid="script-body-error"]').exists()).toBe(false)
  })
})
