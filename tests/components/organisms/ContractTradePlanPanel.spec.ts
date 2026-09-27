import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradePlanPanel from '~/components/organisms/ContractTradePlanPanel.vue'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { buildRecord } from '../../fixtures/contract-trade-journal'

const SETUP_TAGS = [new TradeTagDto(1, 'setup', '突破'), new TradeTagDto(4, 'setup', '回踩')]

function mountPanel(recordOverrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return mount(ContractTradePlanPanel, {
    props: {
      record: buildRecord(recordOverrides).toDomain().toDto(),
      setupTags: SETUP_TAGS,
      timeZoneIdentifier: 'UTC',
      ...props,
    },
  })
}

describe('ContractTradePlanPanel：平倉後', () => {
  it('計畫標示已鎖定，沒有修改入口，成交也沒有；附註依時間由早到晚', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="plan-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="detail-fill-edit"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="notes"]').text().indexOf('第一則')).toBeLessThan(wrapper.get('[data-testid="notes"]').text().indexOf('第二則'))
    expect(wrapper.get('[data-testid="plan-summary"]').text()).toContain('96,380')
  })

  it('加附註送出輸入的內容；空白時按不動', async () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="note-add"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="note-input"]').setValue('止損其實是 96,300')
    await wrapper.get('[data-testid="note-add"]').trigger('click')

    expect(wrapper.emitted('addNote')).toEqual([['止損其實是 96,300']])
  })

  it('換上新的一筆後附註輸入清空', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="note-input"]').setValue('附註')

    await wrapper.setProps({ record: buildRecord().toDomain().toDto() })

    expect((wrapper.get('[data-testid="note-input"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('型態標籤可以貼可以新增', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="tag-option-4"]').trigger('click')
    await wrapper.get('[data-testid="tag-picker-input"]').setValue('趨勢')
    await wrapper.get('[data-testid="tag-picker-create"]').trigger('click')

    expect(wrapper.emitted('assignSetupTags')).toEqual([[[1, 4]]])
    expect(wrapper.emitted('createSetupTag')).toEqual([['趨勢']])
  })

  it('動作失敗的原因呈現在這裡', () => {
    expect(mountPanel({}, { failureMessage: '平倉後成交已鎖定' }).get('[data-testid="detail-action-failure"]').text())
      .toBe('平倉後成交已鎖定')
  })
})

describe('ContractTradePlanPanel：持倉中', () => {
  it('修改計畫：帶出現在的計畫、改完送出', async () => {
    const wrapper = mountPanel({ status: 'open', confidence: null })

    await wrapper.get('[data-testid="plan-edit"]').trigger('click')
    expect((wrapper.get('[data-testid="plan-stop-loss"]').element as HTMLInputElement).value).toBe('96380')
    await wrapper.get('[data-testid="plan-stop-loss"]').setValue('96300')
    await wrapper.get('[data-testid="plan-take-profit"]').setValue('101000')
    await wrapper.get('[data-testid="plan-entry-reason"]').setValue('改理由')
    await wrapper.get('[data-testid="plan-confidence"]').setValue('4')
    await wrapper.get('[data-testid="plan-save"]').trigger('click')

    expect(wrapper.emitted('savePlan')).toEqual([['96300', '101000', '改理由', 4]])
  })

  it('信心留空送 null；取消就收起來', async () => {
    const wrapper = mountPanel({ status: 'open', plannedStopLossPrice: null, plannedTakeProfitPrice: null, confidence: 3 })

    await wrapper.get('[data-testid="plan-edit"]').trigger('click')
    await wrapper.get('[data-testid="plan-confidence"]').setValue('')
    await wrapper.get('[data-testid="plan-save"]').trigger('click')
    await wrapper.get('[data-testid="plan-cancel"]').trigger('click')

    expect(wrapper.emitted('savePlan')).toEqual([['', '', '4H 收在前高之上', null]])
    expect(wrapper.find('[data-testid="plan-stop-loss"]').exists()).toBe(false)
  })

  it('修正與刪除成交', async () => {
    const wrapper = mountPanel({ status: 'open' })

    await wrapper.get('[data-testid="detail-fill-remove"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-edit"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-price"]').setValue('97906')
    await wrapper.get('[data-testid="detail-fill-quantity"]').setValue('0.031')
    await wrapper.get('[data-testid="detail-fill-fee"]').setValue('1.2')
    await wrapper.get('[data-testid="detail-fill-save"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-cancel"]').trigger('click')

    expect(wrapper.emitted('removeFill')).toEqual([[1]])
    const [[fill, priceText, quantityText, feeText]] = wrapper.emitted('amendFill') as [[{ id: number }, string, string, string]]
    expect([fill.id, priceText, quantityText, feeText]).toEqual([1, '97906', '0.031', '1.2'])
    expect(wrapper.find('[data-testid="detail-fill-price"]').exists()).toBe(false)
  })

  it('還沒有附註時沒有附註清單', () => {
    expect(mountPanel({ notes: [] }).find('[data-testid="notes"]').exists()).toBe(false)
  })

  it('沒填信心與理由時寫未填', () => {
    const text = mountPanel({ status: 'open', confidence: null, entryReason: '' }).get('[data-testid="plan-summary"]').text()

    expect(text).toContain('未填')
  })
})
