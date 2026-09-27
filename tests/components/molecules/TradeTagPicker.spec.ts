import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

const TAGS = [new TradeTagDto(1, 'setup', '突破'), new TradeTagDto(2, 'setup', '回踩')]

describe('TradeTagPicker', () => {
  it('點一下貼上、再點一下拿掉', async () => {
    const wrapper = mount(TradeTagPicker, { props: { tags: TAGS, selectedIds: [1] } })

    await wrapper.get('[data-testid="tag-option-2"]').trigger('click')
    await wrapper.get('[data-testid="tag-option-1"]').trigger('click')

    expect(wrapper.emitted('update:selectedIds')).toEqual([[[1, 2]], [[2]]])
    expect(wrapper.get('[data-testid="tag-option-2"]').attributes('aria-pressed')).toBe('true')
  })

  it('就地新增：去掉空白後送出並清空；空白不送', async () => {
    const wrapper = mount(TradeTagPicker, { props: { tags: TAGS, selectedIds: [] } })

    await wrapper.get('[data-testid="tag-picker-input"]').trigger('keydown.enter')
    await wrapper.get('[data-testid="tag-picker-input"]').setValue('  突破回踩 ')
    await wrapper.get('[data-testid="tag-picker-input"]').trigger('keydown.enter')

    expect(wrapper.emitted('create')).toEqual([['突破回踩']])
    expect((wrapper.get('[data-testid="tag-picker-input"]').element as HTMLInputElement).value).toBe('')
  })

  it('不能新增時沒有輸入框', () => {
    const wrapper = mount(TradeTagPicker, { props: { tags: TAGS, selectedIds: [], creatable: false } })

    expect(wrapper.find('[data-testid="tag-picker-input"]').exists()).toBe(false)
  })
})
