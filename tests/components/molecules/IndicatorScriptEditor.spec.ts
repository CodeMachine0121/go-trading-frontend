import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'
import { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'

const TEMPLATE = new IndicatorScriptTemplateDto(
  'package main\n\nfunc Calculate(data []indicator.KCandle) map[string]float64 {',
  '}',
  'return map[string]float64{"均價": 110}')

async function mountEditor(overrides: { errorMessage?: string | null, modelValue?: string } = {}) {
  const wrapper = mount(IndicatorScriptEditor, {
    props: { scriptTemplate: TEMPLATE, modelValue: 'sum := 0.0', ...overrides },
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()

  return wrapper
}

/** 讀某一段程式碼「寫了什麼」——不含行號欄。 */
function codeOf(wrapper: Awaited<ReturnType<typeof mountEditor>>, testId: string): string {
  return wrapper.get(`[data-testid="${testId}"]`).element
    .querySelector('.cm-content')?.textContent ?? ''
}

/** 讀某一段程式碼的行號。第一個是編輯器用來量寬度的隱藏元素，不算數。 */
function lineNumbersOf(wrapper: Awaited<ReturnType<typeof mountEditor>>, testId: string): string[] {
  const gutter = wrapper.get(`[data-testid="${testId}"]`).element
    .querySelector('.cm-lineNumbers')

  return [...gutter?.querySelectorAll('.cm-gutterElement') ?? []]
    .slice(1)
    .map(lineNumber => lineNumber.textContent ?? '')
}

describe('IndicatorScriptEditor', () => {
  it('外框的頭尾都看得到，使用者知道自己寫的內容被放進哪裡', async () => {
    const wrapper = await mountEditor()

    expect(codeOf(wrapper, 'script-frame-header'))
      .toContain('func Calculate(data []indicator.KCandle) map[string]float64 {')
    expect(codeOf(wrapper, 'script-frame-footer')).toBe('}')
  })

  it('外框改不動——它不是輸入欄位', async () => {
    const wrapper = await mountEditor()

    const frameHeader = wrapper.get('[data-testid="script-frame-header"]').element
    expect(frameHeader.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('false')
  })

  it('行號連著整份檔案數下去，後端說第幾行就是畫面上的第幾行', async () => {
    const wrapper = await mountEditor({ modelValue: 'sum := 0.0\nreturn nil' })

    // 外框開頭三行 → 內容從第四行開始 → 兩行內容之後，收尾在第六行
    expect(lineNumbersOf(wrapper, 'script-frame-header')).toEqual(['1', '2', '3'])
    expect(lineNumbersOf(wrapper, 'script-body')).toEqual(['4', '5'])
    expect(lineNumbersOf(wrapper, 'script-frame-footer')).toEqual(['6'])
  })

  it('內容變長時，收尾那一行的號碼跟著往下走', async () => {
    const wrapper = await mountEditor({ modelValue: 'one' })
    expect(lineNumbersOf(wrapper, 'script-frame-footer')).toEqual(['5'])

    await wrapper.setProps({ modelValue: 'one\ntwo\nthree' })
    await flushPromises()

    expect(lineNumbersOf(wrapper, 'script-frame-footer')).toEqual(['7'])
  })

  it('外框跟著換掉的樣板走', async () => {
    const wrapper = await mountEditor()

    await wrapper.setProps({
      scriptTemplate: new IndicatorScriptTemplateDto(
        'func Calculate(data []indicator.KCandle) map[string][]bool {', '}', 'return nil'),
    })
    await flushPromises()

    expect(codeOf(wrapper, 'script-frame-header')).toContain('map[string][]bool')
  })

  it('內容出錯時把訊息標在算式旁邊', async () => {
    const wrapper = await mountEditor({ errorMessage: '請填寫算式內容' })

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請填寫算式內容')
  })

  it('沒有錯誤時不擺錯誤訊息', async () => {
    const wrapper = await mountEditor()

    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })
})
