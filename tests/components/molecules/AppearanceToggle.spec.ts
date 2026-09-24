import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppearanceToggle from '~/components/molecules/AppearanceToggle.vue'
import { AppearanceDomain } from '~/domain/models/domains/appearance-domain'

const followingSystem = new AppearanceDomain('system', true).toDto()

describe('AppearanceToggle', () => {
  it.each([
    { name: '頂列那一種', variant: 'compact' as const },
    { name: '設定頁那一種', variant: 'labelled' as const },
  ])('$name：選中的是目前的選擇，按另一個就說出它', async ({ variant }) => {
    const wrapper = mount(AppearanceToggle, { props: { appearance: followingSystem, variant } })

    const lightOption = variant === 'compact'
      ? wrapper.get('[data-testid="appearance-light"]')
      : wrapper.get('[data-testid="tab-light"]')
    await lightOption.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['light']])
  })

  it('頂列那一種標出目前的選擇', () => {
    const wrapper = mount(AppearanceToggle, { props: { appearance: followingSystem } })

    expect(wrapper.get('[data-testid="appearance-system"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-testid="appearance-dark"]').attributes('aria-checked')).toBe('false')
  })
})
