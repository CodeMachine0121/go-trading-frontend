import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppTextarea from '~/components/atoms/AppTextarea.vue'

describe('AppTextarea', () => {
  it('打字會把內容往上帶', async () => {
    const wrapper = mount(AppTextarea, { props: { modelValue: '' } })

    await wrapper.get('textarea').setValue('問一句')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['問一句'])
  })

  it('由外面塞進來的內容顯示得出來', () => {
    // 被拒絕之後那一句會回到輸入框，走的就是這一條路。
    const wrapper = mount(AppTextarea, { props: { modelValue: '回到輸入框的那一句' } })

    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value)
      .toBe('回到輸入框的那一句')
  })

  it('原生屬性一路傳下去，不重新包一層', () => {
    const wrapper = mount(AppTextarea, {
      props: { modelValue: '' },
      attrs: { disabled: true, placeholder: '問一句行情' },
    })

    const textarea = wrapper.get('textarea')
    expect(textarea.attributes('disabled')).toBeDefined()
    expect(textarea.attributes('placeholder')).toBe('問一句行情')
  })

  it('有問題時說得出來', () => {
    const wrapper = mount(AppTextarea, { props: { modelValue: '', invalid: true } })

    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
  })

  it('可以從外面把焦點交給它', () => {
    // 回答回來時輸入框要自己取得焦點，好接著問下一句。
    const wrapper = mount(AppTextarea, { props: { modelValue: '' }, attachTo: document.body })

    wrapper.vm.focus()

    expect(document.activeElement).toBe(wrapper.get('textarea').element)
    wrapper.unmount()
  })
})
