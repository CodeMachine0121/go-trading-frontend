import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'
import { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'

const FRAME_HEADER = 'package main\n\nimport (\n\t"indicator"\n\t"math"\n\t"sort"\n)'

const TEMPLATE = new IndicatorScriptTemplateDto(
  FRAME_HEADER,
  'func Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}',
  'func Calculate(data []indicator.KCandle) map[string]float64 {\n\t\n}')

async function mountEditor(overrides: { errorMessage?: string | null, modelValue?: string } = {}) {
  const wrapper = mount(IndicatorScriptEditor, {
    props: {
      scriptTemplate: TEMPLATE,
      modelValue: 'func Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}',
      ...overrides,
    },
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
  it('唯讀外框只到 import，進入點與收尾都在可編輯區', async () => {
    const wrapper = await mountEditor()

    const frameHeader = codeOf(wrapper, 'script-frame-header')
    expect(frameHeader).toContain('package main')
    expect(frameHeader).toContain('"indicator"')
    expect(frameHeader).not.toContain('func Calculate')
    expect(wrapper.find('[data-testid="script-frame-footer"]').exists()).toBe(false)
    expect(codeOf(wrapper, 'script-body')).toContain('func Calculate(data []indicator.KCandle)')
  })

  it('外框改不動——它不是輸入欄位', async () => {
    const wrapper = await mountEditor()

    const frameHeader = wrapper.get('[data-testid="script-frame-header"]').element
    expect(frameHeader.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('false')
  })

  it('行號連著整份檔案數下去，主體從第九行開始', async () => {
    const wrapper = await mountEditor({ modelValue: 'func Calculate() {}\nhelper()' })

    // 外框七行加一個分隔的空行 = 八行 → 主體從第九行開始
    expect(lineNumbersOf(wrapper, 'script-frame-header'))
      .toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
    expect(lineNumbersOf(wrapper, 'script-body')).toEqual(['9', '10'])
  })

  it('外框不隨樣板換掉——它是固定的七行', async () => {
    const wrapper = await mountEditor()

    await wrapper.setProps({
      scriptTemplate: new IndicatorScriptTemplateDto(
        FRAME_HEADER,
        'func Calculate(data []indicator.KCandle) indicator.Signal {\n\treturn indicator.Hold\n}',
        'func Calculate(data []indicator.KCandle) indicator.Signal {\n\t\n}'),
    })
    await flushPromises()

    expect(codeOf(wrapper, 'script-frame-header')).not.toContain('func Calculate')
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
