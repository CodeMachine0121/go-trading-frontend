import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'

function mountConfirmDialog(props: Record<string, unknown> = {}) {
  return mount(ConfirmDialog, {
    props: { open: true, title: '刪除策略', message: '刪掉就沒了，救不回來。', ...props },
  })
}

describe('ConfirmDialog', () => {
  it('把要再問一次的那句話擺出來', () => {
    const wrapper = mountConfirmDialog()

    expect(wrapper.text()).toContain('刪掉就沒了，救不回來。')
  })

  it('按確定就是確定，不會同時當成取消', async () => {
    const wrapper = mountConfirmDialog({ confirmLabel: '刪除' })

    await wrapper.findAll('button').filter(button => button.text() === '刪除')[0]?.trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('按取消就是取消，不會同時當成確定', async () => {
    const wrapper = mountConfirmDialog()

    await wrapper.findAll('button').filter(button => button.text() === '取消')[0]?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('關掉對話框等同取消——不會被當成答應了', async () => {
    const wrapper = mountConfirmDialog()

    await wrapper.get('.app-modal__close').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('確定鈕的字由使用端決定', () => {
    const wrapper = mountConfirmDialog({ confirmLabel: '放棄未儲存的變更' })

    expect(wrapper.text()).toContain('放棄未儲存的變更')
  })
})
