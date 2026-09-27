import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradeReviewPanel from '~/components/organisms/ContractTradeReviewPanel.vue'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { ContractTradeReview } from '~/domain/models/entities/contract-trade-review'
import { buildRecord } from '../../fixtures/contract-trade-journal'

const MISTAKE_TAGS = [new TradeTagDto(2, 'mistake', '提早出場'), new TradeTagDto(3, 'mistake', '追價進場')]

describe('ContractTradeReviewPanel', () => {
  it('持倉中寫平倉後才能檢討，沒有可填的欄位', () => {
    const wrapper = mount(ContractTradeReviewPanel, {
      props: { record: buildRecord({ status: 'open' }).toDomain().toDto(), mistakeTags: MISTAKE_TAGS },
    })

    expect(wrapper.get('[data-testid="review-unavailable"]').text()).toBe('平倉後才能檢討')
    expect(wrapper.find('[data-testid="review-form"]').exists()).toBe(false)
  })

  it('平倉後填好送出，評分只能 1 到 5', async () => {
    const wrapper = mount(ContractTradeReviewPanel, {
      props: { record: buildRecord({ tags: [] }).toDomain().toDto(), mistakeTags: MISTAKE_TAGS },
    })

    const scoreOptions = wrapper.get('[data-testid="review-execution-score"]').findAll('option').map(option => option.text())
    await wrapper.get('[data-testid="review-went-well"]').setValue('照計畫')
    await wrapper.get('[data-testid="review-went-wrong"]').setValue('提早出場')
    await wrapper.get('[data-testid="review-next-time"]').setValue('讓止盈成交')
    await wrapper.get('[data-testid="review-execution-score"]').setValue('4')
    await wrapper.get('[data-testid="tag-option-2"]').trigger('click')
    await wrapper.get('[data-testid="review-form"]').trigger('submit')

    expect(scoreOptions).toEqual(['1 / 5', '2 / 5', '3 / 5', '4 / 5', '5 / 5'])
    expect(wrapper.emitted('submit')).toEqual([['照計畫', '提早出場', '讓止盈成交', 4, [2]]])
    expect(wrapper.get('[data-testid="review-save"]').text()).toBe('寫下檢討')
  })

  it('已檢討時帶出原本的內容，鍵寫更新檢討', () => {
    const wrapper = mount(ContractTradeReviewPanel, {
      props: {
        record: buildRecord({ status: 'reviewed', review: new ContractTradeReview('照計畫', '提早', '下次', 5, new Date()) }).toDomain().toDto(),
        mistakeTags: MISTAKE_TAGS,
      },
    })

    expect((wrapper.get('[data-testid="review-went-well"]').element as HTMLTextAreaElement).value).toBe('照計畫')
    expect((wrapper.get('[data-testid="review-execution-score"]').element as HTMLSelectElement).value).toBe('5')
    expect(wrapper.get('[data-testid="tag-option-2"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="review-save"]').text()).toBe('更新檢討')
  })
})
