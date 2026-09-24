import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleQueryForm from '~/components/molecules/KCandleQueryForm.vue'
import { buildTimeZone } from '../../fixtures/time-zone'

function mountForm(props: Record<string, unknown> = {}) {
  return mount(KCandleQueryForm, {
    props: {
      startTime: '2026-08-29T12:00',
      timeZone: buildTimeZone(),
      ...props,
    },
    slots: { symbol: '<span data-testid="symbol-slot">挑標的那一格</span>' },
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
    { description: '開始時間沒填', field: 'startTimeError', message: '請填寫開始時間' },
    { description: '開始時間指向未來', field: 'startTimeError', message: '開始時間不得晚於目前時間' },
  ])('$description 時把訊息標在對應欄位旁', ({ field, message }) => {
    const wrapper = mountForm({ [field]: message })

    const fieldErrors = wrapper.findAll('[data-testid="field-error"]')
    expect(fieldErrors).toHaveLength(1)
    expect(fieldErrors[0]?.text()).toBe(message)
  })

  it('沒有結束時間可填——查詢一律查到送出當下', () => {
    const wrapper = mountForm()

    expect(wrapper.find('[data-testid="end-time-input"]').exists()).toBe(false)
  })

  it('使用者改動開始時間時把新值往上送', async () => {
    const wrapper = mountForm()

    await wrapper.get('[data-testid="start-time-input"]').setValue('2026-08-30T08:00')

    expect(wrapper.emitted('update:startTime')?.at(-1)).toEqual(['2026-08-30T08:00'])
  })

  it('挑標的那一格由使用端放進來——現貨與合約各從自己的清單挑', () => {
    const wrapper = mountForm()

    expect(wrapper.get('[data-testid="symbol-slot"]').text()).toBe('挑標的那一格')
  })
})
