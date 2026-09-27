import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradePlanPanel from '~/components/organisms/TradePlanPanel.vue'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { buildRecord } from '../../fixtures/contract-trade-journal'

const SETUP_TAGS = [new TradeTagDto(1, 'setup', '突破'), new TradeTagDto(4, 'setup', '回踩')]

function planPropsOf(recordOverrides: Record<string, unknown> = {}) {
  const record = buildRecord(recordOverrides).toDomain().toDto()

  return {
    planLocked: record.planLocked,
    entryReason: record.entryReason,
    plannedStopLossPrice: record.plannedStopLossPrice,
    plannedTakeProfitPrice: record.plannedTakeProfitPrice,
    plannedStopLossText: record.plannedStopLossText,
    plannedTakeProfitText: record.plannedTakeProfitText,
    confidence: record.confidence,
    selectedSetupTags: record.setupTags,
  }
}

function mountPanel(recordOverrides: Record<string, unknown> = {}) {
  return mount(TradePlanPanel, {
    props: { ...planPropsOf(recordOverrides), setupTags: SETUP_TAGS },
  })
}

describe('TradePlanPanel：平倉後', () => {
  it('進場時的我標示已鎖定，沒有修改入口，理由與計畫照當時的寫', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="plan-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-edit"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="plan-reason"]').text()).toBe('4H 收在前高之上')
    expect(wrapper.get('[data-testid="plan-summary"]').text()).toContain('96,380')
  })

  it('型態標籤可以貼可以新增', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="tag-option-4"]').trigger('click')
    await wrapper.get('[data-testid="tag-picker-input"]').setValue('趨勢')
    await wrapper.get('[data-testid="tag-picker-create"]').trigger('click')

    expect(wrapper.emitted('assignSetupTags')).toEqual([[[1, 4]]])
    expect(wrapper.emitted('createSetupTag')).toEqual([['趨勢']])
  })
})

describe('TradePlanPanel：持倉中', () => {
  it('修改計畫：帶出現在的計畫、改完送出', async () => {
    const wrapper = mountPanel({ status: 'open', confidence: null })

    await wrapper.get('[data-testid="plan-edit"]').trigger('click')
    expect((wrapper.get('[data-testid="plan-stop-loss"]').element as HTMLInputElement).value).toBe('96380')
    await wrapper.get('[data-testid="plan-stop-loss"]').setValue('96300')
    await wrapper.get('[data-testid="plan-take-profit"]').setValue('101000')
    await wrapper.get('[data-testid="plan-entry-reason"]').setValue('改理由')
    await wrapper.get('[data-testid="app-rating-4"]').trigger('click')
    await wrapper.get('[data-testid="plan-save"]').trigger('click')

    expect(wrapper.emitted('savePlan')).toEqual([['96300', '101000', '改理由', 4]])
  })

  it('信心清空送 null；取消就收起來', async () => {
    const wrapper = mountPanel({ status: 'open', plannedStopLossPrice: null, plannedTakeProfitPrice: null, confidence: 3 })

    await wrapper.get('[data-testid="plan-edit"]').trigger('click')
    await wrapper.get('[data-testid="app-rating-3"]').trigger('click')
    await wrapper.get('[data-testid="plan-save"]').trigger('click')
    await wrapper.get('[data-testid="plan-cancel"]').trigger('click')

    expect(wrapper.emitted('savePlan')).toEqual([['', '', '4H 收在前高之上', null]])
    expect(wrapper.find('[data-testid="plan-stop-loss"]').exists()).toBe(false)
  })

  it('沒填信心與理由時說出來', () => {
    const wrapper = mountPanel({ status: 'open', confidence: null, entryReason: '' })

    expect(wrapper.get('[data-testid="plan-summary"]').text()).toContain('未填')
    expect(wrapper.get('[data-testid="plan-reason"]').text()).toBe('沒有寫進場理由')
  })
})
