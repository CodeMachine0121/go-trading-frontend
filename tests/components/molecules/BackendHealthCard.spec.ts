import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BackendHealthCard from '~/components/molecules/BackendHealthCard.vue'
import { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')

describe('BackendHealthCard', () => {
  it.each([
    { healthy: true, status: 'healthy', label: '正常', tone: 'success' as const, expectedText: '正常' },
    { healthy: false, status: 'down', label: '異常', tone: 'danger' as const, expectedText: '異常' },
  ])('依 DTO 渲染狀態（healthy=$healthy）', ({ healthy, status, label, tone, expectedText }) => {
    const wrapper = mount(BackendHealthCard, {
      props: {
        health: new BackendHealthDto(healthy, status, CHECKED_AT, label, tone),
        loading: false,
        errorMessage: null,
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.get('[data-testid="status"]').text()).toContain(expectedText)
  })

  it('有錯誤訊息時只顯示錯誤，不顯示狀態', () => {
    const wrapper = mount(BackendHealthCard, {
      props: {
        health: new BackendHealthDto(true, 'healthy', CHECKED_AT, '正常', 'success'),
        loading: false,
        errorMessage: '連不上後端',
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.get('[data-testid="error"]').text()).toBe('連不上後端')
    expect(wrapper.find('[data-testid="status"]').exists()).toBe(false)
  })

  it('按下重新檢查會發出 refresh 事件', async () => {
    const wrapper = mount(BackendHealthCard, {
      props: { health: null, loading: false, errorMessage: null, timeZone: buildTimeZone() },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('loading 時停用按鈕', () => {
    const wrapper = mount(BackendHealthCard, {
      props: { health: null, loading: true, errorMessage: null, timeZone: buildTimeZone() },
    })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it.each([
    { identifier: 'UTC', expected: '2026-08-30 00:00', city: '世界標準時間' },
    { identifier: 'Asia/Taipei', expected: '2026-08-30 08:00', city: '台北' },
  ])('檢查時間照選定的時區說（$identifier）', ({ identifier, expected, city }) => {
    // 操作台上每一個時間都照頂欄選定的時區講。這一個當初漏掉了，
    // 於是台北的使用者會看到全站唯一一個差八小時的時間。
    const wrapper = mount(BackendHealthCard, {
      props: {
        health: new BackendHealthDto(true, 'healthy', CHECKED_AT, '正常', 'success'),
        loading: false,
        errorMessage: null,
        timeZone: buildTimeZone(identifier),
      },
    })

    expect(wrapper.get('[data-testid="status"]').text()).toContain(expected)
    expect(wrapper.get('[data-testid="status"]').text()).toContain(city)
  })
})
