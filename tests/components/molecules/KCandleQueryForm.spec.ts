import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleQueryForm from '~/components/molecules/KCandleQueryForm.vue'

function mountForm(props: Record<string, unknown> = {}) {
  return mount(KCandleQueryForm, {
    props: {
      symbol: 'BTCUSDT',
      startTime: '2026-08-29T12:00',
      endTime: '2026-08-30T12:00',
      ...props,
    },
  })
}

describe('KCandleQueryForm', () => {
  it('送出時發出 submit 事件', async () => {
    const wrapper = mountForm()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('查詢中時送出按鈕停用且顯示進行中', () => {
    const wrapper = mountForm({ loading: true })

    const submitButton = wrapper.get('[data-testid="submit-button"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(submitButton.text()).toBe('查詢中…')
  })

  it('查詢結束後送出按鈕恢復可用', () => {
    const wrapper = mountForm({ loading: false })

    const submitButton = wrapper.get('[data-testid="submit-button"]')
    expect(submitButton.attributes('disabled')).toBeUndefined()
    expect(submitButton.text()).toBe('查詢')
  })

  it.each([
    { field: 'symbolError', message: '請指定交易標的' },
    { field: 'startTimeError', message: '請填寫開始時間' },
    { field: 'endTimeError', message: '結束時間不得早於開始時間' },
  ])('把 $field 的訊息標在對應欄位旁', ({ field, message }) => {
    const wrapper = mountForm({ [field]: message })

    const fieldErrors = wrapper.findAll('[data-testid="field-error"]')
    expect(fieldErrors).toHaveLength(1)
    expect(fieldErrors[0]?.text()).toBe(message)
  })

  it('使用者改動輸入時把新值往上送', async () => {
    const wrapper = mountForm()

    await wrapper.get('[data-testid="symbol-input"]').setValue('ETHUSDT')

    expect(wrapper.emitted('update:symbol')?.at(-1)).toEqual(['ETHUSDT'])
  })
})
