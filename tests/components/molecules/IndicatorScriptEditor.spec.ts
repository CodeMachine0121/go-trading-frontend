import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'

const WHOLE_SCRIPT = [
  'package main',
  '',
  'import (',
  '\t"indicator"',
  '\t"math"',
  '\t"sort"',
  ')',
  '',
  'func Calculate(data []indicator.KCandle) map[string]float64 {',
  '\treturn nil',
  '}',
].join('\n')

async function mountEditor(
  overrides: { errorMessage?: string | null, modelValue?: string, concealed?: boolean } = {},
) {
  const wrapper = mount(IndicatorScriptEditor, {
    // 掛到真正的文件上：這一份裡有一條驗的是游標落在哪裡，而沒進文件的元素收不到焦點。
    attachTo: document.body,
    props: {
      modelValue: WHOLE_SCRIPT,
      ...overrides,
    },
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()

  return wrapper
}

/** 讀那一段程式碼「寫了什麼」——不含行號欄。 */
function codeOf(wrapper: Awaited<ReturnType<typeof mountEditor>>): string {
  return wrapper.get('[data-testid="script"]').element
    .querySelector('.cm-content')?.textContent ?? ''
}

/** 讀行號。第一個是編輯器用來量寬度的隱藏元素，不算數。 */
function lineNumbersOf(wrapper: Awaited<ReturnType<typeof mountEditor>>): string[] {
  const gutter = wrapper.get('[data-testid="script"]').element
    .querySelector('.cm-lineNumbers')

  return [...gutter?.querySelectorAll('.cm-gutterElement') ?? []]
    .slice(1)
    .map(lineNumber => lineNumber.textContent ?? '')
}

describe('IndicatorScriptEditor', () => {
  it('整份算式都在同一塊可編輯區裡，含最上面的宣告與匯入', async () => {
    const wrapper = await mountEditor()

    const code = codeOf(wrapper)
    expect(code).toContain('package main')
    expect(code).toContain('"indicator"')
    expect(code).toContain('func Calculate(data []indicator.KCandle)')
  })

  it('畫面上沒有任何唯讀的算式區塊——每一行都改得動', async () => {
    const wrapper = await mountEditor()

    expect(wrapper.get('[data-testid="script"]').element
      .querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true')
    expect(wrapper.findAll('.cm-content')).toHaveLength(1)
  })

  it('行號從第 1 行算起', async () => {
    const wrapper = await mountEditor({ modelValue: 'package main\n\nfunc Calculate() {}' })

    expect(lineNumbersOf(wrapper)).toEqual(['1', '2', '3'])
  })

  it('點在程式碼下面那片空白上，游標接著最後一行', async () => {
    // 那片空白看起來就是檔案的後面，點下去卻沒反應的話，使用者會以為編輯區壞了。
    const wrapper = await mountEditor()

    await wrapper.get('[data-testid="script-filler"]').trigger('mousedown')
    await flushPromises()

    expect(document.activeElement)
      .toBe(wrapper.get('[data-testid="script"]').element.querySelector('.cm-content'))
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

describe('IndicatorScriptEditor 算式不公開的時候', () => {
  it.each([
    { concealed: true, hasEditor: false, saysConcealed: true },
    { concealed: false, hasEditor: true, saysConcealed: false },
  ])('concealed = $concealed：有編輯器 $hasEditor、說「算式不公開」$saysConcealed',
    async ({ concealed, hasEditor, saysConcealed }) => {
      const wrapper = await mountEditor({ concealed })

      expect(wrapper.find('[data-testid="script"]').exists()).toBe(hasEditor)
      expect(wrapper.text().includes('這支策略腳本的算式不公開')).toBe(saysConcealed)
    })
})
