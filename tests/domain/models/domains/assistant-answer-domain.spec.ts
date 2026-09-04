import { describe, expect, it } from 'vitest'
import { AssistantAnswer } from '~/domain/models/entities/assistant-answer'

const ANSWERED_AT = new Date('2026-09-04T10:00:00.000Z')

describe('AssistantAnswerDomain.toDto', () => {
  it('回答的原文拆成塊，數字原樣帶出來', () => {
    const answerDto = new AssistantAnswer(
      7, '## 走勢摘要\n在盤整。', 3, false, 3184).toDomain().toDto()

    expect(answerDto.conversationId).toBe(7)
    expect(answerDto.blocks.map(block => block.kind)).toEqual(['heading', 'paragraph'])
    expect(answerDto.queryCount).toBe(3)
    expect(answerDto.stoppedAtQueryLimit).toBe(false)
    expect(answerDto.usage).toBe(3184)
  })

  it('這一次的產出變成對話串上一則帶附註的回答', () => {
    const messageDto = new AssistantAnswer(7, '在盤整。', 3, true, 3184)
      .toDomain().toDto().toMessageDto(ANSWERED_AT)

    expect(messageDto.role).toBe('answer')
    expect(messageDto.createdAt).toBe(ANSWERED_AT)
    expect(messageDto.note?.label).toBe('查了 3 次 · 份量 3184')
    expect(messageDto.note?.stoppedAtQueryLimitLabel).toContain('已達查詢次數上限')
  })
})
