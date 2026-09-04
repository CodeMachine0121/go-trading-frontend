import { describe, expect, it } from 'vitest'
import { Conversation } from '~/domain/models/entities/conversation'
import { ConversationMessage } from '~/domain/models/entities/conversation-message'
import { ConversationSummary } from '~/domain/models/entities/conversation-summary'

const LAST_ACTIVE_AT = new Date('2026-09-04T10:30:00.000Z')

describe('ConversationDomain.toDto', () => {
  it('每一則都在，由早到晚', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '問 1', new Date('2026-09-04T10:00:00.000Z')),
      new ConversationMessage('answer', '答 1', new Date('2026-09-04T10:01:00.000Z')),
    ]).toDomain().toDto()

    expect(conversationDto.id).toBe(7)
    expect(conversationDto.lastActiveAt).toBe(LAST_ACTIVE_AT)
    expect(conversationDto.messages.map(message => message.role)).toEqual(['ask', 'answer'])
  })

  it('讀回來的回答也拆成塊', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('answer', '## 小標\n一段話', LAST_ACTIVE_AT),
    ]).toDomain().toDto()

    expect(conversationDto.messages[0]?.blocks.map(block => block.kind))
      .toEqual(['heading', 'paragraph'])
  })

  it('讀回來的每一則都沒有附註', () => {
    // 那組數字只在剛收到那一刻拿得到，這裡沒有東西可以帶——不是漏了，是形狀就是這樣。
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '問 1', LAST_ACTIVE_AT),
      new ConversationMessage('answer', '答 1', LAST_ACTIVE_AT),
    ]).toDomain().toDto()

    expect(conversationDto.messages.every(message => message.note === null)).toBe(true)
  })

  it('一則都沒有的對話得到空清單', () => {
    expect(new Conversation(7, LAST_ACTIVE_AT, []).toDomain().toDto().messages).toEqual([])
  })
})

describe('ConversationSummaryDomain.toDto', () => {
  it('原樣帶出識別碼、時刻與則數', () => {
    const summaryDto = new ConversationSummary(7, LAST_ACTIVE_AT, 6).toDomain().toDto()

    expect(summaryDto.id).toBe(7)
    expect(summaryDto.lastActiveAt).toBe(LAST_ACTIVE_AT)
    expect(summaryDto.messageCountLabel).toBe('6 則訊息')
  })
})
