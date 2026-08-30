import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BackendHealthCard from '~/components/BackendHealthCard.vue'
import { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')

describe('BackendHealthCard', () => {
  it.each([
    { healthy: true, status: 'ok', expectedText: '正常' },
    { healthy: false, status: 'down', expectedText: '異常' },
  ])('依 DTO 渲染狀態（healthy=$healthy）', ({ healthy, status, expectedText }) => {
    const wrapper = mount(BackendHealthCard, {
      props: {
        health: new BackendHealthDto(healthy, status, CHECKED_AT),
        loading: false,
        errorMessage: null,
      },
    })

    expect(wrapper.get('[data-testid="status"]').text()).toContain(expectedText)
  })

  it('有錯誤訊息時只顯示錯誤，不顯示狀態', () => {
    const wrapper = mount(BackendHealthCard, {
      props: {
        health: new BackendHealthDto(true, 'ok', CHECKED_AT),
        loading: false,
        errorMessage: '連不上後端',
      },
    })

    expect(wrapper.get('[data-testid="error"]').text()).toBe('連不上後端')
    expect(wrapper.find('[data-testid="status"]').exists()).toBe(false)
  })

  it('按下重新檢查會發出 refresh 事件', async () => {
    const wrapper = mount(BackendHealthCard, {
      props: { health: null, loading: false, errorMessage: null },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('loading 時停用按鈕', () => {
    const wrapper = mount(BackendHealthCard, {
      props: { health: null, loading: true, errorMessage: null },
    })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
