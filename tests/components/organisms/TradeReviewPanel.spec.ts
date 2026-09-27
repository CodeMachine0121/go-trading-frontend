import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradeReviewPanel from '~/components/organisms/TradeReviewPanel.vue'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { TradeReview } from '~/domain/models/entities/trade-review'
import { buildRecord } from '../../fixtures/contract-trade-journal'

const MISTAKE_TAGS = [new TradeTagDto(2, 'mistake', '提早出場'), new TradeTagDto(3, 'mistake', '追價進場')]

function reviewPropsOf(record: ReturnType<typeof buildRecord>) {
  const recordDto = record.toDomain().toDto()

  return {
    review: recordDto.review,
    canWriteReview: recordDto.canWriteReview,
    reviewUnavailableMessage: recordDto.reviewUnavailableMessage,
    recordedMistakeTags: recordDto.mistakeTags,
  }
}

describe('TradeReviewPanel', () => {
  it('持倉中寫平倉後才能檢討，沒有可填的欄位', () => {
    const wrapper = mount(TradeReviewPanel, {
      props: { ...reviewPropsOf(buildRecord({ status: 'open' })), mistakeTags: MISTAKE_TAGS },
    })

    expect(wrapper.get('[data-testid="review-unavailable"]').text()).toBe('平倉後才能檢討')
    expect(wrapper.find('[data-testid="review-form"]').exists()).toBe(false)
  })

  it('平倉後還沒寫時標示尚未填寫，填好送出，評分是 1 到 5 點', async () => {
    const wrapper = mount(TradeReviewPanel, {
      props: { ...reviewPropsOf(buildRecord({ tags: [] })), mistakeTags: MISTAKE_TAGS },
    })

    expect(wrapper.get('[data-testid="review-pending"]').text()).toBe('尚未填寫')
    expect(wrapper.get('[data-testid="review-execution-score"]').findAll('[role="radio"]')).toHaveLength(5)
    await wrapper.get('[data-testid="review-went-well"]').setValue('照計畫')
    await wrapper.get('[data-testid="review-went-wrong"]').setValue('提早出場')
    await wrapper.get('[data-testid="review-next-time"]').setValue('讓止盈成交')
    await wrapper.get('[data-testid="app-rating-4"]').trigger('click')
    await wrapper.get('[data-testid="tag-option-2"]').trigger('click')
    await wrapper.get('[data-testid="review-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([['照計畫', '提早出場', '讓止盈成交', 4, [2]]])
    expect(wrapper.get('[data-testid="review-save"]').text()).toBe('寫下檢討')
  })

  it('已檢討時帶出原本的內容，鍵寫更新檢討', () => {
    const wrapper = mount(TradeReviewPanel, {
      props: {
        ...reviewPropsOf(buildRecord({ status: 'reviewed', review: new TradeReview('照計畫', '提早', '下次', 5, new Date()) })),
        mistakeTags: MISTAKE_TAGS,
      },
    })

    expect((wrapper.get('[data-testid="review-went-well"]').element as HTMLTextAreaElement).value).toBe('照計畫')
    expect(wrapper.get('[data-testid="app-rating-5"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-testid="review-pending"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="tag-option-2"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="review-save"]').text()).toBe('更新檢討')
  })
})
