import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AppModal from '~/components/atoms/AppModal.vue'

describe('AppModal', () => {
  it('沒打開時什麼都不擺在畫面上', () => {
    const wrapper = mount(AppModal, {
      props: { open: false, title: '策略腳本清單' },
      slots: { default: '<p>裡面的東西</p>' },
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('裡面的東西')
  })

  it('打開時把標題與內容擺出來', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: '策略腳本清單' },
      slots: { default: '<p>裡面的東西</p>' },
    })

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('策略腳本清單')
    expect(wrapper.get('.app-modal__title').text()).toBe('策略腳本清單')
    expect(wrapper.text()).toContain('裡面的東西')
  })

  it('沒有動作插槽時不擺出動作那一列', () => {
    const wrapper = mount(AppModal, { props: { open: true, title: 'x' } })

    expect(wrapper.find('.app-modal__actions').exists()).toBe(false)
  })

  it('有動作插槽時擺出來', () => {
    const wrapper = mount(AppModal, {
      props: { open: true, title: 'x' },
      slots: { actions: '<button>確定</button>' },
    })

    expect(wrapper.get('.app-modal__actions').text()).toBe('確定')
  })

  it.each([
    { name: '按關閉鈕', selector: '.app-modal__close' },
    { name: '點在對話框以外的地方', selector: '.app-modal__backdrop' },
  ])('$name 就要求關閉', async ({ selector }) => {
    const wrapper = mount(AppModal, { props: { open: true, title: 'x' } })

    await wrapper.get(selector).trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('打開之後按 Esc 就要求關閉', async () => {
    const wrapper = mount(AppModal, { props: { open: false, title: 'x' }, attachTo: document.body })
    await wrapper.setProps({ open: true })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('關掉之後不再理會 Esc——三個對話框不會搶同一個按鍵', async () => {
    const wrapper = mount(AppModal, { props: { open: false, title: 'x' }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await wrapper.setProps({ open: false })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('開著的時候被拆掉，留下的監聽器也一起收掉', async () => {
    const wrapper = mount(AppModal, { props: { open: false, title: 'x' }, attachTo: document.body })
    await wrapper.setProps({ open: true })

    wrapper.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('按其他鍵不關閉', async () => {
    const wrapper = mount(AppModal, { props: { open: false, title: 'x' }, attachTo: document.body })
    await wrapper.setProps({ open: true })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  describe('往下推那條握把', () => {
    function pushHandleBy(wrapper: ReturnType<typeof mount>, distance: number) {
      const handle = wrapper.get('[data-testid="modal-handle"]')
      const element = handle.element as HTMLElement
      element.setPointerCapture = () => {}
      element.releasePointerCapture = () => {}

      handle.trigger('pointerdown', { clientY: 0, pointerId: 1 })
      element.dispatchEvent(new PointerEvent('pointermove', { clientY: distance }))
      element.dispatchEvent(new PointerEvent('pointerup', { clientY: distance }))
    }

    it('推得夠遠就關起來', () => {
      const wrapper = mount(AppModal, { props: { open: true, title: '挑一支策略腳本' } })

      pushHandleBy(wrapper, 150)

      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('只推一點點就彈回去，不關', () => {
      // 這張紙裡面有可以捲的內容，手指在上面移動幾個像素是家常便飯——
      // 那種距離就關掉，等於每次想往下看都會把它弄不見。
      const wrapper = mount(AppModal, { props: { open: true, title: '挑一支策略腳本' } })

      pushHandleBy(wrapper, 20)

      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('推的時候紙跟著手指走，放手就回到原位', async () => {
      const wrapper = mount(AppModal, { props: { open: true, title: '挑一支策略腳本' } })
      const handle = wrapper.get('[data-testid="modal-handle"]')
      const element = handle.element as HTMLElement
      element.setPointerCapture = () => {}

      await handle.trigger('pointerdown', { clientY: 0, pointerId: 1 })
      element.dispatchEvent(new PointerEvent('pointermove', { clientY: 40 }))
      await nextTick()

      expect(wrapper.get('.app-modal__panel').attributes('style')).toContain('40px')

      element.dispatchEvent(new PointerEvent('pointerup', { clientY: 40 }))
      await nextTick()

      expect(wrapper.get('.app-modal__panel').attributes('style')).toBeUndefined()
    })

    it('往上拖不動它——那只會把標題頂出畫面', async () => {
      const wrapper = mount(AppModal, { props: { open: true, title: '挑一支策略腳本' } })
      const handle = wrapper.get('[data-testid="modal-handle"]')
      const element = handle.element as HTMLElement
      element.setPointerCapture = () => {}

      await handle.trigger('pointerdown', { clientY: 100, pointerId: 1 })
      element.dispatchEvent(new PointerEvent('pointermove', { clientY: 20 }))
      await nextTick()

      expect(wrapper.get('.app-modal__panel').attributes('style')).toBeUndefined()
    })
  })

  it('一掛上去就已經開著的那一種，Esc 照樣關得掉', () => {
    // `open` 從頭到尾沒有「變動」過，所以只看變動的那個 watcher 不會跑。
    // 每一個對話框都從關著開始的時候這個漏洞看不出來——
    // 而窄螢幕上那張「更多」是連同 `open` 一起被渲染出來的。
    const wrapper = mount(AppModal, { props: { open: true, title: '更多' } })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('拆掉之後就不再聽 Esc——不留一個對著已消失元件喊話的監聽器', () => {
    // 這一則問的是**到底有沒有掛在 document 上**：拆掉之後再按 Esc，
    // 從那個已經消失的元件身上是問不出任何東西的，所以要問邊界本身。
    const listen = vi.spyOn(document, 'addEventListener')
    const stopListening = vi.spyOn(document, 'removeEventListener')

    mount(AppModal, { props: { open: true, title: '更多' } }).unmount()

    const listened = listen.mock.calls.filter(([event]) => String(event) === 'keydown')
    const stopped = stopListening.mock.calls.filter(([event]) => String(event) === 'keydown')

    expect(listened).toHaveLength(1)
    expect(stopped.map(([, handler]) => handler)).toContain(listened[0]?.[1])

    listen.mockRestore()
    stopListening.mockRestore()
  })
})
