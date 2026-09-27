import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppRating from '~/components/atoms/AppRating.vue'

function mountRating(modelValue: number | null, options: { clearable?: boolean, disabled?: boolean } = {}) {
  return mount(AppRating, {
    props: { 'modelValue': modelValue, 'label': '信心', ...options, 'onUpdate:modelValue': () => {} },
  })
}

describe('AppRating', () => {
  it.each([
    { name: '沒選時按第三點就選三', modelValue: null, pressed: 3, clearable: true, expected: 3 },
    { name: '選了三再按第五點就改成五', modelValue: 3, pressed: 5, clearable: true, expected: 5 },
    { name: '再按一次目前選的那一點即清空', modelValue: 3, pressed: 3, clearable: true, expected: null },
  ])('$name', async ({ modelValue, pressed, clearable, expected }) => {
    const wrapper = mountRating(modelValue, { clearable })

    await wrapper.get(`[data-testid="app-rating-${pressed}"]`).trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[expected]])
  })

  it('不能清空時再按一次目前選的那一點不改變任何東西', async () => {
    const wrapper = mountRating(3, { clearable: false })

    await wrapper.get('[data-testid="app-rating-3"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('按不動的時候不改變任何東西', async () => {
    const wrapper = mountRating(2, { disabled: true })

    await wrapper.get('[data-testid="app-rating-4"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('點亮到選的那一點，並說出選了幾分', () => {
    const wrapper = mountRating(3)

    expect(wrapper.findAll('.app-rating__dot--filled')).toHaveLength(3)
    expect(wrapper.get('[data-testid="app-rating-3"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('3 / 5')
  })
})
