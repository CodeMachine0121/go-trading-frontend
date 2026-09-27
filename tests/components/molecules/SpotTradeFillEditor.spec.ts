import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpotTradeFillEditor from '~/components/molecules/SpotTradeFillEditor.vue'
import { SpotTradeDraftFillInputDto } from '~/domain/models/dto/spot-trade-draft-fill-input-dto'

function fills() {
  return [new SpotTradeDraftFillInputDto(1, 'buy', '2026-09-27T09:00', '1050', '1000', '')]
}

describe('SpotTradeFillEditor', () => {
  it('買進與賣出各有自己的價格欄名；加一筆與移除交給上層', async () => {
    const wrapper = mount(SpotTradeFillEditor, { props: { fills: fills() } })

    await wrapper.get('[data-testid="fill-add-sell"]').trigger('click')
    await wrapper.get('[data-testid="fill-add-buy"]').trigger('click')

    expect(wrapper.text()).toContain('買進價')
    expect(wrapper.get('[data-testid="fill-add-sell"]').text()).toBe('＋ 加一筆賣出')
    expect(wrapper.emitted('add')).toEqual([['sell'], ['buy']])
    expect(wrapper.get('[data-testid="fill-remove"]').attributes('disabled')).toBeDefined()
  })

  it('整數股提示優先於欄位拒絕；拒絕落在買賣欄位時寫在下方', () => {
    const wholeShares = mount(SpotTradeFillEditor, { props: { fills: fills(), wholeSharesMessage: '台股數量以股計，必須是整數', rejectedField: 'fillQuantity', rejectionMessage: '別的' } })
    expect(wholeShares.get('[data-testid="fill-whole-shares"]').text()).toBe('台股數量以股計，必須是整數')
    expect(wholeShares.find('[data-testid="fill-error"]').exists()).toBe(false)

    const rejected = mount(SpotTradeFillEditor, { props: { fills: fills(), rejectedField: 'exitQuantity', rejectionMessage: '賣出超過持有' } })
    expect(rejected.get('[data-testid="fill-error"]').text()).toBe('賣出超過持有')

    const elsewhere = mount(SpotTradeFillEditor, { props: { fills: fills(), rejectedField: 'symbol', rejectionMessage: '找不到標的' } })
    expect(elsewhere.find('[data-testid="fill-error"]').exists()).toBe(false)
  })

  it('改動作、時間與手續費會寫回那一列', async () => {
    const editedFills = fills()
    const wrapper = mount(SpotTradeFillEditor, { props: { fills: editedFills } })

    await wrapper.get('[data-testid="fill-kind"]').setValue('sell')
    await wrapper.get('[data-testid="fill-time"]').setValue('2026-09-27T10:30')
    await wrapper.get('[data-testid="fill-fee"]').setValue('1983')

    expect(editedFills[0]).toMatchObject({ kind: 'sell', filledAtText: '2026-09-27T10:30', feeText: '1983' })
    expect(wrapper.text()).toContain('賣出價')
  })

  it('有兩筆以上才能移除', async () => {
    const twoFills = [...fills(), new SpotTradeDraftFillInputDto(2, 'sell', '2026-09-27T10:00', '1100', '400', '')]
    const wrapper = mount(SpotTradeFillEditor, { props: { fills: twoFills } })

    await wrapper.findAll('[data-testid="fill-remove"]')[1]?.trigger('click')

    expect(wrapper.text()).toContain('賣出價')
    expect(wrapper.emitted('remove')).toEqual([[2]])
  })
})
