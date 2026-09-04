import { describe, expect, it, vi } from 'vitest'
import { AssistantConversationApplication } from '~/application/assistant-conversation-application'
import type { IAssistantConversationProxy } from '~/domain/interface/i-assistant-conversation-proxy'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import { AssistantAnswer } from '~/domain/models/entities/assistant-answer'
import { Conversation } from '~/domain/models/entities/conversation'
import { ConversationMessage } from '~/domain/models/entities/conversation-message'
import { ConversationSummary } from '~/domain/models/entities/conversation-summary'
import { AssistantConversationService } from '~/domain/service/assistant-conversation-service'

const MOMENT = new Date('2026-09-04T10:00:00.000Z')

/**
 * 注入**真的** domain service 與真的 domain model，只 mock 最外層的 proxy——
 * 測 application 時會連帶測到 service 與 model（見 .claude/rules/testing.md）。
 */
function buildApplicationUnderTest(overrides: Partial<IAssistantConversationProxy> = {}) {
  const proxy: IAssistantConversationProxy = {
    ask: vi.fn().mockResolvedValue(new AssistantAnswer(7, '在盤整。', 2, false, 3184)),
    listConversations: vi.fn().mockResolvedValue([new ConversationSummary(7, MOMENT, 2)]),
    getConversation: vi.fn().mockResolvedValue(new Conversation(7, MOMENT, [
      new ConversationMessage('ask', '問 1', MOMENT),
    ])),
    ...overrides,
  }

  return {
    application: new AssistantConversationApplication(new AssistantConversationService(proxy)),
    proxy,
  }
}

describe('AssistantConversationApplication', () => {
  it('問一句拿回這一次的產出', async () => {
    const { application } = buildApplicationUnderTest()

    const answerDto = await application.ask(new AssistantAskDto(7, 'BTCUSDT 最近走勢如何'))

    expect(answerDto?.conversationId).toBe(7)
    expect(answerDto?.usage).toBe(3184)
  })

  it('不可送的一句回 null，代表一次呼叫都沒有發生', async () => {
    const { application, proxy } = buildApplicationUnderTest()

    await expect(application.ask(new AssistantAskDto(null, '   '))).resolves.toBeNull()
    expect(proxy.ask).not.toHaveBeenCalled()
  })

  it('列出對話拿回清單', async () => {
    const { application } = buildApplicationUnderTest()

    const summaryDtos = await application.listConversations()

    expect(summaryDtos).toHaveLength(1)
    expect(summaryDtos[0]?.messageCountLabel).toBe('2 則訊息')
  })

  it('讀一段對話拿回它的每一則', async () => {
    const { application } = buildApplicationUnderTest()

    const conversationDto = await application.getConversation(7)

    expect(conversationDto.messages).toHaveLength(1)
    expect(conversationDto.messages[0]?.note).toBeNull()
  })
})
