import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ContractTradeFillEditor from '~/components/molecules/ContractTradeFillEditor.vue'
import { ContractTradeDraftFillInputDto } from '~/domain/models/dto/contract-trade-draft-fill-input-dto'
import { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import { ContractTradeDraftFillSizePreviewDto } from '~/domain/models/dto/contract-trade-draft-fill-size-preview-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

function fillInput(key: number, priceText = '97850', quantityText = '0.051') {
  return new ContractTradeDraftFillInputDto(key, 'entry', '2026-09-25T06:03', priceText, quantityText, 'taker', '')
}

describe('ContractTradeFillEditor', () => {
  it('預填的成交價與數量標示請改成實際成交', () => {
    const wrapper = mount(ContractTradeFillEditor, {
      props: {
        fills: [fillInput(1)],
        fees: [new ContractTradeDraftFeePreviewDto('2.45', null)],
        prefilledFields: new Set(['fillPrice', 'fillQuantity'] as const),
      },
    })

    expect(wrapper.get('[data-testid="fill-price-confirm"]').text()).toBe('請改成實際開倉的價格與數量')
    expect(wrapper.get('[data-testid="fill-quantity-confirm"]').text()).toBe('請改成實際開倉的價格與數量')
    expect(wrapper.get('[data-testid="fill-fee"]').attributes('placeholder')).toBe('2.45')
  })

  it('尚未設定費率時提示；出場超過持倉的原話寫在成交旁', () => {
    const wrapper = mount(ContractTradeFillEditor, {
      props: {
        fills: [fillInput(1)],
        fees: [new ContractTradeDraftFeePreviewDto('0.00', new LocalizedTextVo('尚未設定手續費率', 'Fee rates not set yet'))],
        rejectedField: 'exitQuantity',
        rejectionMessage: new UntranslatedTextVo('出場數量超過目前持倉 0.031，要反手請先平倉再新增一筆反方向的交易'),
      },
    })

    expect(wrapper.get('[data-testid="fill-fee-note"]').text()).toBe('尚未設定手續費率')
    expect(wrapper.get('[data-testid="fill-error"]').text()).toContain('出場數量超過目前持倉')
    expect(wrapper.get('[data-testid="fill-quantity"]').attributes('aria-invalid')).toBe('true')
  })

  it('不是成交欄的拒絕不寫在這裡', () => {
    const wrapper = mount(ContractTradeFillEditor, {
      props: { fills: [fillInput(1)], fees: [], rejectedField: 'plannedStopLossPrice', rejectionMessage: new UntranslatedTextVo('x') },
    })

    expect(wrapper.find('[data-testid="fill-error"]').exists()).toBe(false)
  })

  it('加一筆進場或出場；只剩一筆時不能移除', async () => {
    const wrapper = mount(ContractTradeFillEditor, { props: { fills: [fillInput(1)], fees: [] } })

    await wrapper.get('[data-testid="fill-add-exit"]').trigger('click')
    await wrapper.get('[data-testid="fill-add-entry"]').trigger('click')

    expect(wrapper.emitted('add')).toEqual([['exit'], ['entry']])
    expect(wrapper.get('[data-testid="fill-remove"]').attributes('disabled')).toBeDefined()
  })

  it('兩筆以上時可以移除；輸入改到那一筆上', async () => {
    const fills = [fillInput(1), fillInput(2, '', '')]
    const wrapper = mount(ContractTradeFillEditor, { props: { fills, fees: [] } })

    await wrapper.findAll('[data-testid="fill-remove"]')[1]!.trigger('click')
    await wrapper.findAll('[data-testid="fill-price"]')[1]!.setValue('97960')
    await wrapper.findAll('[data-testid="fill-quantity"]')[1]!.setValue('0.021')
    await wrapper.findAll('[data-testid="fill-kind"]')[1]!.setValue('exit')
    await wrapper.findAll('[data-testid="fill-liquidity"]')[1]!.setValue('maker')
    await wrapper.findAll('[data-testid="fill-fee"]')[1]!.setValue('1.2')
    await wrapper.findAll('[data-testid="fill-time"]')[1]!.setValue('2026-09-25T06:11')

    expect(wrapper.emitted('remove')).toEqual([[2]])
    expect(fills[1]).toMatchObject({
      priceText: '97960', quantityText: '0.021', kind: 'exit', liquidity: 'maker', feeText: '1.2', filledAtText: '2026-09-25T06:11',
    })
  })

  it('數量欄寫出單位並標示給輸入框；改用保證金輸入，預覽寫在小卡下方', async () => {
    const fills = [fillInput(1, '84780.9', '1')]
    const wrapper = mount(ContractTradeFillEditor, {
      props: {
        fills,
        fees: [],
        quantityLabel: new LocalizedTextVo('數量（BTC）', 'Quantity (BTC)'),
        fillSizes: [new ContractTradeDraftFillSizePreviewDto(
          new LocalizedTextVo('名目 84,780.90・保證金 42,390.45', 'Notional 84,780.90 · Margin 42,390.45'),
          new LocalizedTextVo('手續費約佔名目 0.000059%', 'Fee is about 0.000059% of notional'))],
      },
    })

    expect(wrapper.text()).toContain('數量（BTC）')
    expect(wrapper.get('[data-testid="fill-size-preview"]').text()).toContain('名目 84,780.90・保證金 42,390.45')
    expect(wrapper.get('[data-testid="fill-fee-share"]').text()).toBe('手續費約佔名目 0.000059%')

    await wrapper.get('[data-testid="fill-size-mode"]').setValue('margin')

    expect(fills[0]?.sizeMode).toBe('margin')
    expect(wrapper.get('[data-testid="fill-quantity"]').attributes('aria-labelledby')).toBe('fill-size-label-1 fill-size-mode-1')
    expect(wrapper.get('#fill-size-label-1').text()).toBe('數量（BTC）')
  })

  it('換成英文時欄位、數量單位、預覽與費率提示都說英文，後端的原話不翻', async () => {
    const wrapper = mount(ContractTradeFillEditor, {
      props: {
        fills: [fillInput(1, '84780.9', '1')],
        fees: [new ContractTradeDraftFeePreviewDto('0.00', new LocalizedTextVo('尚未設定手續費率', 'Fee rates not set yet'))],
        quantityLabel: new LocalizedTextVo('數量（BTC）', 'Quantity (BTC)'),
        fillSizes: [new ContractTradeDraftFillSizePreviewDto(
          new LocalizedTextVo('名目 84,780.90・保證金 42,390.45', 'Notional 84,780.90 · Margin 42,390.45'), null)],
        rejectedField: 'exitQuantity',
        rejectionMessage: new UntranslatedTextVo('出場數量超過目前持倉 0.031'),
      },
    })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('#fill-size-label-1').text()).toBe('Quantity (BTC)')
    expect(wrapper.get('[data-testid="fill-fee-note"]').text()).toBe('Fee rates not set yet')
    expect(wrapper.get('[data-testid="fill-size-preview"]').text()).toBe('Notional 84,780.90 · Margin 42,390.45')
    expect(wrapper.get('[data-testid="fill-error"]').text()).toBe('出場數量超過目前持倉 0.031')
    expect(wrapper.text()).toContain('Entry / add')
    expect(wrapper.get('[data-testid="fill-add-exit"]').text()).toBe('+ Reduce')
  })
})
