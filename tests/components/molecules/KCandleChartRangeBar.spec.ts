import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleChartRangeBar from '~/components/molecules/KCandleChartRangeBar.vue'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { PriceScaleMode } from '~/domain/models/vo/price-scale-mode-vo'
import { buildTimeZone } from '../../fixtures/time-zone'
import { DEFAULT_AGGREGATION_INTERVAL_CHOICE } from '../../fixtures/aggregation-interval-choice'

const ONE_DAY = new KCandleChartRangePresetDto(new LocalizedTextVo('一天', '1 day'), 86_400_000, DEFAULT_AGGREGATION_INTERVAL_CHOICE)
const FIVE_DAYS = new KCandleChartRangePresetDto(new LocalizedTextVo('五天', '5 days'), 5 * 86_400_000, DEFAULT_AGGREGATION_INTERVAL_CHOICE)

function mountBar(overrides: { priceScaleMode?: PriceScaleMode, autoScale?: boolean, timeZone?: string, coveredRangeCaption?: string | null } = {}) {
  return mount(KCandleChartRangeBar, {
    props: {
      presets: [ONE_DAY, FIVE_DAYS],
      activePreset: ONE_DAY,
      now: new Date('2026-10-16T09:05:07.000Z'),
      timeZone: buildTimeZone(overrides.timeZone ?? 'UTC'),
      coveredRangeCaption: overrides.coveredRangeCaption ?? null,
      priceScaleMode: overrides.priceScaleMode ?? 'normal',
      autoScale: overrides.autoScale ?? true,
    },
  })
}

describe('下方細邊', () => {
  it('按下的那一個快捷區間亮著；按另一個就交出它', async () => {
    const wrapper = mountBar()
    const buttons = wrapper.findAll('[data-testid="range-preset-button"]')

    expect(buttons.map(button => button.attributes('aria-pressed'))).toEqual(['true', 'false'])
    await buttons[1]?.trigger('click')
    expect(wrapper.emitted('selectPreset')).toEqual([[FIVE_DAYS]])
  })

  it('時鐘照選定的時區走，旁邊寫出位移', () => {
    expect(mountBar({ timeZone: 'Asia/Taipei' }).get('[data-testid="workspace-clock"]').text())
      .toBe('17:05:07 (UTC+08:00)')
  })

  it.each([
    ['normal', 'percentage-scale', 'percentage'],
    ['normal', 'logarithmic-scale', 'logarithmic'],
    ['percentage', 'logarithmic-scale', 'logarithmic'],
    ['percentage', 'percentage-scale', 'normal'],
    ['logarithmic', 'logarithmic-scale', 'normal'],
  ] as const)('價格軸是 %s 時按 %s：變成 %s', async (current, button, next) => {
    const wrapper = mountBar({ priceScaleMode: current })

    await wrapper.get(`[data-testid="${button}"]`).trigger('click')

    expect(wrapper.emitted('update:priceScaleMode')).toEqual([[next]])
  })

  it('自動縮放亮著時按一下關掉', async () => {
    const wrapper = mountBar({ autoScale: true })

    expect(wrapper.get('[data-testid="auto-scale"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-testid="auto-scale"]').trigger('click')
    expect(wrapper.emitted('update:autoScale')).toEqual([[false]])
  })

  it('有已取回區間的註腳時寫出來；沒有圖時不寫', () => {
    expect(mountBar({ coveredRangeCaption: '手上這批共 3 根' }).get('[data-testid="covered-range"]').text()).toBe('手上這批共 3 根')
    expect(mountBar().find('[data-testid="covered-range"]').exists()).toBe(false)
  })
})
