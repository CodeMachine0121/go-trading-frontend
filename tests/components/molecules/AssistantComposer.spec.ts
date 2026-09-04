import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantComposer from '~/components/molecules/AssistantComposer.vue'

function mountComposer(props: { draft: string, pending?: boolean, autofocus?: boolean }) {
  return mount(AssistantComposer, {
    props: { modelValue: props.draft, pending: props.pending, autofocus: props.autofocus },
    attachTo: document.body,
  })
}

/** 焦點在輸入框上嗎。要真的掛進文件裡才問得出來。 */
function inputHasFocus(wrapper: ReturnType<typeof mountComposer>): boolean {
  return document.activeElement === wrapper.get('[data-testid="assistant-composer-input"]').element
}

describe('AssistantComposer 的送出鍵', () => {
  it('有東西可送時按得動', () => {
    const wrapper = mountComposer({ draft: 'BTCUSDT 最近走勢如何' })

    expect(wrapper.get('[data-testid="assistant-composer-send"]').attributes('disabled'))
      .toBeUndefined()
  })

  it.each([
    { draft: '' },
    { draft: '   ' },
    { draft: '\n\t' },
  ])('說了等於沒說時按不動（$draft）', ({ draft }) => {
    // 空白送出去是純粹浪費的一次呼叫，畫面這裡就擋掉。
    const wrapper = mountComposer({ draft })

    expect(wrapper.get('[data-testid="assistant-composer-send"]').attributes('disabled'))
      .toBeDefined()
  })

  it('等待中按不動', () => {
    const wrapper = mountComposer({ draft: '問一句', pending: true })

    expect(wrapper.get('[data-testid="assistant-composer-send"]').attributes('disabled'))
      .toBeDefined()
  })
})

describe('AssistantComposer 的送出', () => {
  it('按送出就發出送出事件', async () => {
    const wrapper = mountComposer({ draft: '問一句' })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('send')).toHaveLength(1)
  })

  it('Enter 就送出', async () => {
    const wrapper = mountComposer({ draft: '問一句' })

    await wrapper.get('[data-testid="assistant-composer-input"]').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toHaveLength(1)
  })

  it('Shift+Enter 是換行，不是送出', async () => {
    // 這是聊天輸入框的既有慣例，不必再教。
    const wrapper = mountComposer({ draft: '問一句' })

    await wrapper.get('[data-testid="assistant-composer-input"]')
      .trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('等待中按 Enter 不會送出第二句', async () => {
    // 少了這一道，使用者在那可能長達兩分鐘的等待裡多按一次 Enter 就是多花一次錢。
    const wrapper = mountComposer({ draft: '問一句', pending: true })

    await wrapper.get('[data-testid="assistant-composer-input"]').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('說了等於沒說時 Enter 也不送', async () => {
    const wrapper = mountComposer({ draft: '   ' })

    await wrapper.get('[data-testid="assistant-composer-input"]').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('輸入法正在組字時的 Enter 不算送出', async () => {
    // 中文輸入選字按的那個 Enter，不是「我要送出」。
    const wrapper = mountComposer({ draft: '問一句' })

    await wrapper.get('[data-testid="assistant-composer-input"]')
      .trigger('keydown', { key: 'Enter', isComposing: true })

    expect(wrapper.emitted('send')).toBeUndefined()
  })
})

describe('AssistantComposer 的輸入框', () => {
  it('等待中鎖住', () => {
    const wrapper = mountComposer({ draft: '', pending: true })

    expect(wrapper.get('[data-testid="assistant-composer-input"]').attributes('disabled'))
      .toBeDefined()
  })

  it('打字會把內容往上帶', async () => {
    const wrapper = mountComposer({ draft: '' })

    await wrapper.get('[data-testid="assistant-composer-input"]').setValue('問一句')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['問一句'])
  })

  it('輸入框是無框的那一種——框是外面那一枚膠囊', () => {
    // 這一條是那顆送出鍵跑位的修法：`bare` 之下輸入框把寬度交給膠囊分配，
    // 否則它會宣稱要佔滿整條，把不肯縮的送出鍵推到框外面去。
    expect(mountComposer({ draft: '' }).get('[data-testid="assistant-composer-input"]').classes())
      .toContain('app-textarea--bare')
  })

  it('下方說出助手可能會出錯', () => {
    // 這一句不是免責話術：它要讓人在把數字拿去下單之前多看一眼。
    expect(mountComposer({ draft: '' }).text()).toContain('請自行覆核')
  })
})

describe('AssistantComposer 的焦點', () => {
  it('叫出來就等著被打字', () => {
    // 抽屜與整頁都是「叫出來就是要問一句」，光標不必自己再點一下。
    const wrapper = mountComposer({ draft: '', autofocus: true })

    expect(inputHasFocus(wrapper)).toBe(true)
    wrapper.unmount()
  })

  it('沒要求就不搶焦點', () => {
    const wrapper = mountComposer({ draft: '' })

    expect(inputHasFocus(wrapper)).toBe(false)
    wrapper.unmount()
  })

  it('回答回來就把焦點還回來，好接著問下一句', async () => {
    // 等待中輸入框是鎖住的，焦點會掉。不還回來的話，每問一句都要重新點一次。
    const wrapper = mountComposer({ draft: '', pending: true })
    expect(inputHasFocus(wrapper)).toBe(false)

    await wrapper.setProps({ pending: false })

    expect(inputHasFocus(wrapper)).toBe(true)
    wrapper.unmount()
  })

  it('還在等的時候不會把焦點搶回來', async () => {
    const wrapper = mountComposer({ draft: '', pending: false })

    await wrapper.setProps({ pending: true })

    expect(inputHasFocus(wrapper)).toBe(false)
    wrapper.unmount()
  })
})
