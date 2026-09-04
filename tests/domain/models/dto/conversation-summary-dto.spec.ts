import { describe, expect, it } from 'vitest'
import { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'

describe('ConversationSummaryDto.messageCountLabel', () => {
  it.each([
    { messageCount: 0, expectedLabel: '0 則訊息' },
    { messageCount: 1, expectedLabel: '1 則訊息' },
    { messageCount: 6, expectedLabel: '6 則訊息' },
  ])('說出有幾則（$messageCount）', ({ messageCount, expectedLabel }) => {
    // 後端不讓對話取名字，時刻與則數是唯一能認出「這是哪一段」的東西。
    const summary = new ConversationSummaryDto(
      1, new Date('2026-09-04T10:00:00.000Z'), messageCount)

    expect(summary.messageCountLabel).toBe(expectedLabel)
  })
})
