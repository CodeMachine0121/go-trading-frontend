// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CopyTextButton from '~/components/molecules/CopyTextButton.vue'

// 這裡連著組裝根注入的那一份剪貼簿一路測到底，替身只放在最外層的瀏覽器上。
const writeText = vi.fn()

beforeEach(() => {
  writeText.mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function mountButton(props: { text?: string, label?: string } = {}) {
  return mount(CopyTextButton, {
    props: { text: props.text ?? 'sum := 0.0', label: props.label },
  })
}

describe('CopyTextButton', () => {
  it('按下去就把那段文字放進剪貼簿', async () => {
    const wrapper = mountButton({ text: 'close.movingAverage(20)' })

    await wrapper.get('[data-testid="copy-text-button"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('close.movingAverage(20)')
  })

  it('說出自己複製的是什麼', () => {
    // 一顆只有圖示的鍵，讀螢幕的人聽不出它複製的是哪一段。
    const wrapper = mountButton({ label: '複製這段程式碼' })

    expect(wrapper.get('[data-testid="copy-text-button"]').attributes('aria-label'))
      .toBe('複製這段程式碼')
  })

  it('複製完改口說已複製', async () => {
    const wrapper = mountButton()

    await wrapper.get('[data-testid="copy-text-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="copy-text-button"]').attributes('aria-label'))
      .toBe('已複製')
    // 圖示也要跟著換成勾：那顆鍵很小，多數人看的是圖不是字。
    expect(wrapper.get('.app-icon').attributes('data-icon')).toBe('copied')
  })

  it('平常是一個複製的圖示', () => {
    expect(mountButton().get('.app-icon').attributes('data-icon')).toBe('copy')
  })

  it('複製失敗時把理由說出來', async () => {
    writeText.mockRejectedValue(new Error('NotAllowedError'))
    const wrapper = mountButton()

    await wrapper.get('[data-testid="copy-text-button"]').trigger('click')
    await flushPromises()

    const button = wrapper.get('[data-testid="copy-text-button"]')
    expect(button.attributes('aria-label')).toBe('複製失敗，請手動選取這段內容。')
    expect(button.classes()).toContain('copy-text-button--failed')
  })

  it('鍵被收掉之後那個計時器不留著', async () => {
    // 留著的話，兩秒後它會去改一個已經不存在的東西——抽屜關掉的瞬間按過複製，
    // 就正好踩到這裡。
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const wrapper = mountButton()
    await wrapper.get('[data-testid="copy-text-button"]').trigger('click')
    await vi.runAllTicks()

    wrapper.unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
    vi.useRealTimers()
  })

  it('沒按過就收掉的鍵沒有計時器要清', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    mountButton().unmount()

    expect(clearTimeoutSpy).not.toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
