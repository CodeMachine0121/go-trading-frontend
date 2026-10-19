import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SymbolScreeningProfilePanel from '~/components/organisms/SymbolScreeningProfilePanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import { StrategyScript } from '~/domain/models/entities/strategy-script'
import { SymbolScreeningService } from '~/domain/service/symbol-screening-service'
import type { ISymbolScreeningProxy } from '~/domain/interface/i-symbol-screening-proxy'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { buildScreeningProfile } from '../../fixtures/symbol-screening'

const optionSource = new SymbolScreeningService({} as ISymbolScreeningProxy, {} as IStrategyScriptProxy)
const SCREENABLE_SCRIPT = new StrategyScript(9, 'V3', '', 'script', 'signal', [], false, 'contractKCandle')
  .toDomain().toDto()
const OTHER_SCREENABLE_SCRIPT = new StrategyScript(10, 'V4', '', 'script', 'signal', [], false, 'contractKCandle')
  .toDomain().toDto()

function mountPanel(props: Partial<InstanceType<typeof SymbolScreeningProfilePanel>['$props']> = {}) {
  return mount(SymbolScreeningProfilePanel, {
    props: {
      profiles: [buildScreeningProfile(1, '趨勢 V3').toDto()],
      screenableStrategyScripts: [SCREENABLE_SCRIPT],
      aggregationIntervalOptions: optionSource.listAggregationIntervalOptions(),
      tradingModeOptions: optionSource.listTradingModeOptions(),
      loading: false,
      failureMessage: null,
      saving: false,
      saveFailureMessage: null,
      saveProfile: vi.fn().mockResolvedValue(true),
      ...props,
    },
  })
}

describe('SymbolScreeningProfilePanel', () => {
  it('lists each profile with the strategy and the figures it uses', () => {
    const wrapper = mountPanel()

    const profile = wrapper.get('[data-testid="symbol-screening-profile"]')
    expect(profile.text()).toContain('趨勢 V3')
    expect(profile.text()).toContain('V3')
    expect(profile.get('[data-testid="symbol-screening-terms-history-days"]').text()).toBe('歷史 730 天')
    expect(profile.get('[data-testid="symbol-screening-terms"]').findAll('li').map(item => item.text())).toEqual([
      '每 4 小時', '只做多', '歷史 730 天', '3 段', '最少 6 筆', '最低日均成交額 20,000,000 USDT',
      '1 倍', '手續費 0.05%', '滑價 0.05%', '沒有現有組合',
    ])
    expect(profile.get('[data-testid="symbol-screening-terms-baseline"]').text()).toBe('沒有現有組合')
  })

  it('creates a profile with only the name, strategy and interval filled in', async () => {
    const saveProfile = vi.fn().mockResolvedValue(true)
    const wrapper = mountPanel({ saveProfile })
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')

    await wrapper.get('[data-testid="symbol-screening-profile-name"]').setValue('趨勢 V3')
    await wrapper.get('[data-testid="symbol-screening-profile-form"]').trigger('submit')
    await flushPromises()

    const writeDto = saveProfile.mock.calls[0]?.[0] as SymbolScreeningProfileWriteDto
    expect([writeDto.id, writeDto.name, writeDto.strategyScriptId, writeDto.aggregationInterval, writeDto.historyDays])
      .toEqual([null, '趨勢 V3', 9, '4h', ''])
    expect(wrapper.find('[data-testid="symbol-screening-profile-form"]').exists()).toBe(false)
  })

  it('sends every figure that was filled in', async () => {
    const saveProfile = vi.fn().mockResolvedValue(true)
    const wrapper = mountPanel({ saveProfile })
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')
    const form = wrapper.get('[data-testid="symbol-screening-profile-form"]')
    const inputs = form.findAll('input')
    const typed = ['區間 V1', '365', '4', '10', '5000000', '2', '0.04', '0.1', 'btcusdt, ETHUSDT']
    for (const [index, value] of typed.entries()) {
      await inputs[index]?.setValue(value)
    }
    await wrapper.get('[data-testid="symbol-screening-profile-aggregation-interval"]').setValue('1d')
    await wrapper.get('[data-testid="symbol-screening-profile-trading-mode"]').setValue('shortOnly')
    await wrapper.setProps({ screenableStrategyScripts: [SCREENABLE_SCRIPT, OTHER_SCREENABLE_SCRIPT] })
    await wrapper.get('[data-testid="symbol-screening-profile-strategy-script"]').setValue('10')

    await form.trigger('submit')

    const writeDto = saveProfile.mock.calls[0]?.[0] as SymbolScreeningProfileWriteDto
    expect([writeDto.name, writeDto.historyDays, writeDto.segmentCount, writeDto.minimumTradeCount,
      writeDto.minimumAverageDailyQuoteVolume, writeDto.leverage, writeDto.entryCostPercentage,
      writeDto.slippagePercentage, writeDto.baselineSymbols, writeDto.aggregationInterval, writeDto.tradingMode,
      writeDto.strategyScriptId]).toEqual([...typed, '1d', 'shortOnly', 10])
  })

  it('offers only the 4-hour and daily intervals', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')

    const intervals = wrapper.get('[data-testid="symbol-screening-profile-aggregation-interval"]').findAll('option')
    expect(intervals.map(option => [option.attributes('value'), option.text()]))
      .toEqual([['4h', '每 4 小時'], ['1d', '每天']])
  })

  it('keeps the form and its contents when the system refuses the name', async () => {
    const saveProfile = vi.fn().mockResolvedValue(false)
    const wrapper = mountPanel({ saveProfile })
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')
    await wrapper.get('[data-testid="symbol-screening-profile-name"]').setValue('趨勢 V3')

    await wrapper.get('[data-testid="symbol-screening-profile-form"]').trigger('submit')
    await flushPromises()
    await wrapper.setProps({ saveFailureMessage: new LocalizedTextVo('已經有同名的篩選設定', '已經有同名的篩選設定') })

    expect(wrapper.get('[data-testid="symbol-screening-profile-failure"]').text()).toBe('已經有同名的篩選設定')
    expect((wrapper.get('[data-testid="symbol-screening-profile-name"]').element as HTMLInputElement).value).toBe('趨勢 V3')
  })

  it('explains that a screenable strategy is needed and cannot save without one', async () => {
    const wrapper = mountPanel({ screenableStrategyScripts: [] })
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')

    expect(wrapper.find('[data-testid="symbol-screening-no-screenable-scripts"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="symbol-screening-profile-save"]').attributes('disabled')).toBeDefined()
  })

  it('saves nothing when Enter is pressed without a screenable strategy', async () => {
    const saveProfile = vi.fn().mockResolvedValue(true)
    const wrapper = mountPanel({ screenableStrategyScripts: [], saveProfile })
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')

    await wrapper.get('[data-testid="symbol-screening-profile-form"]').trigger('submit')

    expect(saveProfile).not.toHaveBeenCalled()
  })

  it('edits a profile starting from its current figures', async () => {
    const saveProfile = vi.fn().mockResolvedValue(true)
    const wrapper = mountPanel({ saveProfile })
    await wrapper.get('[data-testid="symbol-screening-profile-edit"]').trigger('click')

    await wrapper.get('[data-testid="symbol-screening-profile-history-days"]').setValue('365')
    await wrapper.get('[data-testid="symbol-screening-profile-form"]').trigger('submit')

    const writeDto = saveProfile.mock.calls[0]?.[0] as SymbolScreeningProfileWriteDto
    expect([writeDto.id, writeDto.historyDays, writeDto.segmentCount]).toEqual([1, '365', '3'])
  })

  it('closes the form on cancel and lets the page clear its refusal', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="symbol-screening-profile-create"]').trigger('click')

    await wrapper.get('[data-testid="symbol-screening-profile-cancel"]').trigger('click')

    expect(wrapper.find('[data-testid="symbol-screening-profile-form"]').exists()).toBe(false)
    expect(wrapper.emitted('closeForm')).toHaveLength(1)
  })

  it('deletes a profile only after confirming', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="symbol-screening-profile-delete"]').trigger('click')

    await wrapper.getComponent(ConfirmDialog).vm.$emit('confirm')

    expect(wrapper.emitted('remove')).toEqual([[1]])
  })

  it('does nothing when the confirmation is cancelled', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="symbol-screening-profile-delete"]').trigger('click')

    await wrapper.getComponent(ConfirmDialog).vm.$emit('cancel')

    expect(wrapper.emitted('remove')).toBeUndefined()
    expect(wrapper.getComponent(ConfirmDialog).props('open')).toBe(false)
  })

  it('removes nothing when confirming without a chosen profile', async () => {
    const wrapper = mountPanel()

    await wrapper.getComponent(ConfirmDialog).vm.$emit('confirm')

    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('says there are no profiles yet', () => {
    expect(mountPanel({ profiles: [] }).find('[data-testid="symbol-screening-profiles-empty"]').exists()).toBe(true)
  })

  it('says why the profiles could not be handled', () => {
    const wrapper = mountPanel({ failureMessage: new LocalizedTextVo('有篩選正在使用這份設定，等它結束再刪除', '') })

    expect(wrapper.get('[data-testid="symbol-screening-profiles-failure"]').text())
      .toBe('有篩選正在使用這份設定，等它結束再刪除')
  })
})
