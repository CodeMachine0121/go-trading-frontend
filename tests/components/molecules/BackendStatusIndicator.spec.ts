import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')
const AVAILABLE = new BackendHealthDto(
  true, 'healthy', CHECKED_AT, new LocalizedTextVo('可用', 'Available'), 'success')

describe('BackendStatusIndicator', () => {
  it.each([
    {
      名稱: '還沒問過就說還沒問',
      // 第一筆刻意把型別寫寬，否則 it.each 會照它把整組案例窄化成「health 只能是 null」
      props: {
        health: null as BackendHealthDto | null,
        checking: false,
        errorMessage: null as LocalizedTextVo | null,
      },
      期望: '尚未檢查',
    },
    {
      名稱: '正在問的時候不報上一次的答案',
      props: { health: AVAILABLE, checking: true, errorMessage: null },
      期望: '檢查中',
    },
    {
      名稱: '連不上與不健康是兩件事，下一步也不一樣',
      props: { health: null, checking: false, errorMessage: new LocalizedTextVo('連不上後端', 'Backend unreachable') },
      期望: '連不上',
    },
    {
      名稱: '問到了就照 DTO 說的說',
      props: { health: AVAILABLE, checking: false, errorMessage: null },
      期望: '可用',
    },
  ])('$名稱', ({ props, 期望 }) => {
    const wrapper = mount(BackendStatusIndicator, { props })

    expect(wrapper.get('[data-testid="backend-status"]').text()).toBe(期望)
  })

  it('按下那顆重問的按鈕就要求重新檢查', async () => {
    const wrapper = mount(BackendStatusIndicator, {
      props: { health: AVAILABLE, checking: false, errorMessage: null },
    })

    await wrapper.get('[data-testid="backend-status-recheck"]').trigger('click')

    expect(wrapper.emitted('recheck')).toHaveLength(1)
  })

  it('正在檢查時按不到重問——同一個問題不必問兩次', () => {
    const wrapper = mount(BackendStatusIndicator, {
      props: { health: null, checking: true, errorMessage: null },
    })

    expect(wrapper.get('[data-testid="backend-status-recheck"]').attributes('disabled'))
      .toBeDefined()
  })

  it.each([
    { name: '問到了', props: { health: AVAILABLE as BackendHealthDto | null, checking: false, errorMessage: null }, expected: 'Available' },
    { name: '還沒問過', props: { health: null, checking: false, errorMessage: null }, expected: 'Not checked' },
  ])('英文畫面上$name時說「$expected」', async ({ props, expected }) => {
    const wrapper = mount(BackendStatusIndicator, { props })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="backend-status"]').text()).toBe(expected)
  })
})
