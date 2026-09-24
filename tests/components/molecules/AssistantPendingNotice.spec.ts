import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AssistantPendingNotice from '~/components/molecules/AssistantPendingNotice.vue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AssistantPendingNotice', () => {
  it('一開始就說助手正在查', () => {
    const wrapper = mount(AssistantPendingNotice)

    expect(wrapper.get('[data-testid="assistant-pending"]').text()).toContain('助手正在查')
  })

  it('還沒到門檻前不多說話', () => {
    // 太早講「這一題比較久」，反而讓一個正常速度的回答顯得慢。
    const wrapper = mount(AssistantPendingNotice, { props: { patienceThresholdSeconds: 20 } })

    vi.advanceTimersByTime(19_000)

    expect(wrapper.find('[data-testid="assistant-pending-patience"]').exists()).toBe(false)
  })

  it('超過門檻就補一句，說出最長會等多久', async () => {
    // 完全不講的話，使用者會以為畫面壞了而去重整——重整之後那一次的結果就看不到了。
    const wrapper = mount(AssistantPendingNotice, { props: { patienceThresholdSeconds: 20 } })

    vi.advanceTimersByTime(20_000)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="assistant-pending-patience"]').text()).toContain('兩分鐘')
  })

  it('拆掉之後不再改自己的狀態', () => {
    // 回答回來時這一塊就被換掉了；留著的計時器會對一個已經不在的元件動手。
    const wrapper = mount(AssistantPendingNotice, { props: { patienceThresholdSeconds: 20 } })

    wrapper.unmount()

    expect(() => vi.advanceTimersByTime(20_000)).not.toThrow()
  })
})
