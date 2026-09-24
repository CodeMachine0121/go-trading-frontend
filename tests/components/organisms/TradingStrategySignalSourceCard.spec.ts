// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradingStrategySignalSourceCard from '~/components/organisms/TradingStrategySignalSourceCard.vue'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'

function mountCard(sources: TradingStrategySignalSourceDto[]) {
  return mount(TradingStrategySignalSourceCard, {
    props: {
      sources,
      strategyScriptOptions: [{ value: 9, label: 'MACD' }],
      strategyScriptLabels: sources.map(() => 'MACD'),
      parameterSummaries: sources.map(() => ''),
      parameterInputs: sources.map(() => ({})),
      intervalOptions: [{ value: '5m', label: '五分鐘' }],
      canAdd: true,
      signalSourceLimit: 5,
      shortage: null,
      usageWarnings: {},
      selected: true,
      settingsPlacement: 'beside' as const,
    },
  })
}

describe('TradingStrategySignalSourceCard：設定認得自己開的是哪一個', () => {
  it.each([
    { name: '刪掉排在它前面的那一個，設定仍然開在同一個來源上', removed: 0, expected: '動能' },
    { name: '刪掉排在它後面的那一個，設定不受影響', removed: 2, expected: '動能' },
  ])('$name', async ({ removed, expected }) => {
    const sources = [
      new TradingStrategySignalSourceDto('突破', 9, '5m', []),
      new TradingStrategySignalSourceDto('動能', 9, '5m', []),
      new TradingStrategySignalSourceDto('均線', 9, '5m', []),
    ]
    const wrapper = mountCard(sources)

    await wrapper.get('[data-testid="strategy-script-settings-1"]').trigger('click')
    await wrapper.findAll('[data-testid="strategy-script-remove"]')[removed]!.trigger('click')
    await wrapper.setProps({ sources: sources.filter((_unused, position) => position !== removed) })

    expect(wrapper.emitted('remove')?.at(-1)).toEqual([removed])
    expect((wrapper.get('[data-testid="strategy-script-label-input"]').element as HTMLInputElement).value)
      .toBe(expected)
  })

  it('刪掉正開著的那一個，設定改說「點一個來源」，而不是開在別人身上', async () => {
    const sources = [
      new TradingStrategySignalSourceDto('突破', 9, '5m', []),
      new TradingStrategySignalSourceDto('動能', 9, '5m', []),
    ]
    const wrapper = mountCard(sources)

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-settings-remove"]').trigger('click')
    await wrapper.setProps({ sources: sources.slice(1) })

    expect(wrapper.emitted('remove')?.at(-1)).toEqual([0])
    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(false)
  })
})
