import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import { buildTimeZone } from '../../fixtures/time-zone'

const SELECTABLE_TIME_ZONES = [
  buildTimeZone('UTC'),
  buildTimeZone('Asia/Taipei'),
  buildTimeZone('America/New_York'),
]

function mountField(selectedIdentifier = 'UTC') {
  return mount(TimeZoneField, {
    props: { modelValue: selectedIdentifier, selectableTimeZones: SELECTABLE_TIME_ZONES },
  })
}

describe('TimeZoneField', () => {
  it('列出可選的時區，每一個都標出目前的位移', () => {
    const wrapper = mountField()

    const options = wrapper.findAll('option')
    expect(options).toHaveLength(3)
    expect(options[0]?.text()).toBe('世界標準時間（UTC+00:00）')
    expect(options[1]?.text()).toBe('台北（UTC+08:00）')
  })

  it('目前選的是哪一個看得出來', () => {
    const wrapper = mountField('Asia/Taipei')

    expect(wrapper.get<HTMLSelectElement>('[data-testid="time-zone-select"]').element.value)
      .toBe('Asia/Taipei')
  })

  it('換一個時區時把新的識別字往上送', async () => {
    const wrapper = mountField()

    await wrapper.get('[data-testid="time-zone-select"]').setValue('America/New_York')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['America/New_York'])
  })
})
