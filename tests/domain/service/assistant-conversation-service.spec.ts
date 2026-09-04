import { describe, expect, it, vi } from 'vitest'
import type { IAssistantConversationProxy } from '~/domain/interface/i-assistant-conversation-proxy'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import { AssistantAnswer } from '~/domain/models/entities/assistant-answer'
import { Conversation } from '~/domain/models/entities/conversation'
import { ConversationMessage } from '~/domain/models/entities/conversation-message'
import { ConversationSummary } from '~/domain/models/entities/conversation-summary'
import { AssistantConversationService } from '~/domain/service/assistant-conversation-service'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'

const MOMENT = new Date('2026-09-04T10:00:00.000Z')

// 替身一律用 vi.fn() 對介面產生，不手刻 Fake class（見 .claude/rules/testing.md）
function buildProxyMock(overrides: Partial<IAssistantConversationProxy> = {}): IAssistantConversationProxy {
  return {
    ask: vi.fn().mockResolvedValue(new AssistantAnswer(7, '在盤整。', 2, false, 3184)),
    listConversations: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue(new Conversation(7, MOMENT, [])),
    ...overrides,
  }
}

describe('AssistantConversationService.ask', () => {
  it('把 proxy 回來的產出轉成 DTO', async () => {
    const proxy = buildProxyMock()

    const answerDto = await new AssistantConversationService(proxy)
      .ask(new AssistantAskDto(7, 'BTCUSDT 最近走勢如何'))

    expect(answerDto?.conversationId).toBe(7)
    expect(answerDto?.blocks).toHaveLength(1)
    expect(answerDto?.queryCount).toBe(2)
    expect(proxy.ask).toHaveBeenCalledTimes(1)
  })

  it('收到的是已判定可送的那一份，前後空白不會送出去', async () => {
    const proxy = buildProxyMock()

    await new AssistantConversationService(proxy).ask(new AssistantAskDto(7, '  問一句  '))

    expect(vi.mocked(proxy.ask).mock.calls[0]?.[0]?.question).toBe('問一句')
  })

  it.each([
    { question: '' },
    { question: '   ' },
  ])('說了等於沒說的一句連呼叫都不發生（$question）', async ({ question }) => {
    // 判定寫在打後端之前：空白送出去只是花錢換一句「必須寫點什麼」。
    const proxy = buildProxyMock()

    const answerDto = await new AssistantConversationService(proxy)
      .ask(new AssistantAskDto(null, question))

    expect(answerDto).toBeNull()
    expect(proxy.ask).not.toHaveBeenCalled()
  })

  it('proxy 拋錯時往上拋，不吞掉', async () => {
    const proxy = buildProxyMock({
      ask: vi.fn().mockRejectedValue(new ConversationNotFoundError('找不到')),
    })

    await expect(new AssistantConversationService(proxy).ask(new AssistantAskDto(99, '問一句')))
      .rejects.toBeInstanceOf(ConversationNotFoundError)
  })
})

describe('AssistantConversationService.listConversations', () => {
  it('每一段都轉成 DTO，順序照 proxy 給的', async () => {
    const proxy = buildProxyMock({
      listConversations: vi.fn().mockResolvedValue([
        new ConversationSummary(2, MOMENT, 4),
        new ConversationSummary(1, MOMENT, 2),
      ]),
    })

    const summaryDtos = await new AssistantConversationService(proxy).listConversations()

    expect(summaryDtos.map(summary => summary.id)).toEqual([2, 1])
    expect(summaryDtos[0]?.messageCountLabel).toBe('4 則訊息')
  })

  it('一段都沒有是空清單，不是錯誤', async () => {
    const proxy = buildProxyMock({ listConversations: vi.fn().mockResolvedValue([]) })

    await expect(new AssistantConversationService(proxy).listConversations()).resolves.toEqual([])
  })
})

describe('AssistantConversationService.getConversation', () => {
  it('那一段的每一則都轉成 DTO', async () => {
    const proxy = buildProxyMock({
      getConversation: vi.fn().mockResolvedValue(new Conversation(7, MOMENT, [
        new ConversationMessage('ask', '問 1', MOMENT),
        new ConversationMessage('answer', '答 1', MOMENT),
      ])),
    })

    const conversationDto = await new AssistantConversationService(proxy).getConversation(7)

    expect(conversationDto.messages).toHaveLength(2)
    expect(proxy.getConversation).toHaveBeenCalledWith(7)
  })
})
