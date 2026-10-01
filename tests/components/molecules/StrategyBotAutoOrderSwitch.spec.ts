import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import StrategyBotAutoOrderSwitch from '~/components/molecules/StrategyBotAutoOrderSwitch.vue'
import { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

function mountSwitch(props: Record<string, unknown> = {}) {
  return mount(StrategyBotAutoOrderSwitch, {
    props: { enabled: false, ...props },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

describe('StrategyBotAutoOrderSwitch', () => {
  it.each([true, false])('開關照交易服務說的呈現（%s），旁邊一律標示尚未生效', (enabled) => {
    const wrapper = mountSwitch({ enabled })

    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe(String(enabled))
    expect(wrapper.get('[data-testid="auto-order-not-in-effect"]').text())
      .toBe('尚未生效：目前機器人仍只送 Telegram 通知，不會下單')
  })

  it.each([
    { enabled: false, requested: true },
    { enabled: true, requested: false },
  ])('從 $enabled 按下去是要求 $requested，但自己不先翻面', async ({ enabled, requested }) => {
    const wrapper = mountSwitch({ enabled })

    await wrapper.get('[data-testid="auto-order-switch"]').trigger('click')

    expect(wrapper.emitted('switch')).toEqual([[requested]])
    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe(String(enabled))
  })

  it('送出期間按不動', async () => {
    const wrapper = mountSwitch({ switching: true })

    await wrapper.get('[data-testid="auto-order-switch"]').trigger('click')

    expect(wrapper.emitted('switch')).toBeUndefined()
  })

  it('缺金鑰的拒絕照原話說，並給一條前往設定畫面的路', () => {
    const wrapper = mountSwitch({
      refusal: new AutoOrderRefusalDto(3, new UntranslatedTextVo('請先完成幣安交易金鑰設定，才能打開自動下單'), true),
    })

    expect(wrapper.get('[data-testid="auto-order-refusal"]').text()).toContain('請先完成幣安交易金鑰設定')
    expect(wrapper.get('[data-testid="auto-order-settings-link"]').attributes('href'))
      .toBe('/settings#settings-binance-trading-key')
  })

  it('沒有該市場權限的拒絕照原話說，不給設定的路', () => {
    const wrapper = mountSwitch({
      refusal: new AutoOrderRefusalDto(3, new UntranslatedTextVo('這組幣安交易金鑰沒有合約交易權限'), false),
    })

    expect(wrapper.get('[data-testid="auto-order-refusal"]').text()).toContain('這組幣安交易金鑰沒有合約交易權限')
    expect(wrapper.find('[data-testid="auto-order-settings-link"]').exists()).toBe(false)
  })

  it('其他失敗照原話說', () => {
    const wrapper = mountSwitch({ failureMessage: new UntranslatedTextVo('找不到這台策略機器人') })

    expect(wrapper.get('[data-testid="auto-order-failure"]').text()).toBe('找不到這台策略機器人')
  })

  it('切成英文時，開關、尚未生效那一句與操作台自己說的失敗都換成英文', async () => {
    const wrapper = mountSwitch({
      failureMessage: new LocalizedTextVo('自動下單沒有切換成功。', 'Auto-order could not be switched.'),
    })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.text()).toContain('Auto-order')
    expect(wrapper.get('[data-testid="auto-order-not-in-effect"]').text())
      .toBe('Not in effect yet: the bot still only sends Telegram notifications and does not place orders')
    expect(wrapper.get('[data-testid="auto-order-failure"]').text()).toBe('Auto-order could not be switched.')
  })
})
