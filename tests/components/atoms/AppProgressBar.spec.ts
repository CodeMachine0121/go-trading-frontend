import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppProgressBar from '~/components/atoms/AppProgressBar.vue'

describe('AppProgressBar', () => {
  it.each([
    { active: true, present: true },
    { active: false, present: false },
  ])('active = $active 時那一條橫條 present = $present', ({ active, present }) => {
    const wrapper = mount(AppProgressBar, { props: { active } })

    expect(wrapper.find('[role="progressbar"]').exists()).toBe(present)
  })
})
