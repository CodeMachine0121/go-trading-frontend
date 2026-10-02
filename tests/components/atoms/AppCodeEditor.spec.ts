import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { currentCompletions, startCompletion } from '@codemirror/autocomplete'
import AppCodeEditor from '~/components/atoms/AppCodeEditor.vue'

// 編輯區只驗它作為「輸入元件」的兩件事：把拿到的內容顯示出來、把使用者的改動送回去。
// 著色與縮排是編輯器套件自己的行為，不是我們的業務，不在這裡驗（見 testing.md）。
//
// 編輯器是掛載後才動態載入的，microtask 還輪不到它，所以要等一個真正的 tick。
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()
}

async function mountEditor(modelValue: string) {
  const wrapper = mount(AppCodeEditor, { props: { modelValue } })
  await settle()

  return wrapper
}

describe('AppCodeEditor', () => {
  it('顯示拿到的內容', async () => {
    const wrapper = await mountEditor('sum := 0.0')

    expect(wrapper.text()).toContain('sum := 0.0')
  })

  it('使用者改了內容就送回去', async () => {
    const wrapper = await mountEditor('sum := 0.0')

    const firstLine = wrapper.element.querySelector('.cm-line')
    firstLine!.textContent = 'sum := 1.0'
    wrapper.element.querySelector('.cm-content')!.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()

    expect(wrapper.emitted('update:modelValue')).toEqual([['sum := 1.0']])
  })

  it('外面換掉內容時跟著換', async () => {
    const wrapper = await mountEditor('sum := 0.0')

    await wrapper.setProps({ modelValue: 'return nil' })
    await settle()

    expect(wrapper.text()).toContain('return nil')
    expect(wrapper.text()).not.toContain('sum := 0.0')
  })

  it('內容沒變時不去打擾編輯器', async () => {
    const wrapper = await mountEditor('sum := 0.0')

    await wrapper.setProps({ modelValue: 'sum := 0.0' })
    await settle()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('編輯器還沒載完就被收掉時不會出事', async () => {
    const wrapper = mount(AppCodeEditor, { props: { modelValue: 'sum := 0.0' } })

    wrapper.unmount()
    await settle()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('收掉時把編輯器一起收乾淨', async () => {
    const wrapper = await mountEditor('sum := 0.0')
    const host = wrapper.element as HTMLElement

    wrapper.unmount()
    await settle()

    expect(host.querySelector('.cm-editor')).toBeNull()
  })

  it.each([
    { language: 'zh-TW', expected: '走訪每一根 K 線' },
    { language: 'en', expected: 'Loop over every K-candle' },
  ])('補齊清單上片段的說明照打開當下的語言（$language）說', async ({ language, expected }) => {
    const wrapper = await mountEditor('forcandle')
    const view = EditorView.findFromDOM(wrapper.element.querySelector('.cm-editor') as HTMLElement)!

    wrapper.vm.$i18n.locale = language
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    startCompletion(view)

    // 補齊清單是非同步打開的，等它真的開出來再看。
    await vi.waitFor(() => expect(
      currentCompletions(view.state).map(completion => completion.detail)).toContain(expected))
  })
})
