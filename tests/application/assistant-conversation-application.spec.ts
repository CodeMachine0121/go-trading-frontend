import { describe, expect, it, vi } from 'vitest'
import { AssistantConversationApplication } from '~/application/assistant-conversation-application'
import type { IAssistantConversationProxy } from '~/domain/interface/i-assistant-conversation-proxy'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import { AssistantAnswerStarted } from '~/domain/models/entities/assistant-answer-started'
import { AssistantPendingRevision } from '~/domain/models/entities/assistant-pending-revision'
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
    ask: vi.fn().mockResolvedValue(new AssistantAnswerStarted(7, 9, 'running')),
    listConversations: vi.fn().mockResolvedValue([new ConversationSummary(7, MOMENT, 2)]),
    getConversation: vi.fn().mockResolvedValue(new Conversation(7, MOMENT, [
      new ConversationMessage('ask', '問 1', MOMENT, 'answered'),
      new ConversationMessage('answer', '答 1', MOMENT, 'answered', '', 2, false, 3184),
    ])),
    refreshConversation: vi.fn(),
    confirmPendingRevision: vi.fn(),
    rejectPendingRevision: vi.fn(),
    ...overrides,
  }

  return {
    application: new AssistantConversationApplication(new AssistantConversationService(proxy)),
    proxy,
  }
}

describe('AssistantConversationApplication', () => {
  it('問一句拿回去哪裡找答案,而不是答案', async () => {
    // 助手可能來回幾十趟、要好幾分鐘。把送出的人留在線上等那麼久,
    // 正是這整套設計要移除的東西。
    const { application } = buildApplicationUnderTest()

    const startedDto = await application.ask(new AssistantAskDto(7, 'BTCUSDT 最近走勢如何'))

    expect(startedDto?.conversationId).toBe(7)
    expect(startedDto?.turnId).toBe(9)
    expect(startedDto?.status).toBe('running')
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

  it('讀一段對話拿回它的每一則,回答那一則帶著附註', async () => {
    const { application } = buildApplicationUnderTest()

    const conversationDto = await application.getConversation(7)

    expect(conversationDto.messages).toHaveLength(2)
    expect(conversationDto.messages[0]?.note).toBeNull()
    expect(conversationDto.messages[1]?.note?.label).toBe('查了 2 次 · 份量 3184')
  })
})

describe('AssistantConversationApplication.refreshConversation', () => {
  it('回頭詢問走背景那一條，交回來的形狀與挑一段對話時相同', async () => {
    const conversation = new Conversation(5, MOMENT, [
      new ConversationMessage('ask', '問 1', MOMENT, 'answered'),
    ])
    const { application, proxy } = buildApplicationUnderTest({
      refreshConversation: vi.fn().mockResolvedValue(conversation),
      getConversation: vi.fn().mockResolvedValue(conversation),
    })

    const refreshed = await application.refreshConversation(5)

    expect(proxy.refreshConversation).toHaveBeenCalledWith(5)
    expect(proxy.getConversation).not.toHaveBeenCalled()
    expect(refreshed).toEqual(await application.getConversation(5))
  })
})

describe('AssistantConversationApplication 確認與拒絕一筆待確認修改', () => {
  it.each([
    { resolution: 'confirm' as const, status: 'confirmed' as const, statusLabel: '已確認' },
    { resolution: 'reject' as const, status: 'rejected' as const, statusLabel: '已拒絕' },
  ])('$resolution 交回那一筆的新樣子', async ({ resolution, status, statusLabel }) => {
    const resolved = new AssistantPendingRevision(70, 'tradingStrategy', '動能追蹤', '{}', status, MOMENT)
    const { application, proxy } = buildApplicationUnderTest({
      confirmPendingRevision: vi.fn().mockResolvedValue(resolved),
      rejectPendingRevision: vi.fn().mockResolvedValue(resolved),
    })

    const revisionDto = resolution === 'confirm'
      ? await application.confirmPendingRevision(70)
      : await application.rejectPendingRevision(70)

    expect(resolution === 'confirm' ? proxy.confirmPendingRevision : proxy.rejectPendingRevision)
      .toHaveBeenCalledWith(70)
    expect(revisionDto.title).toBe('交易策略「動能追蹤」')
    expect(revisionDto.statusLabel).toBe(statusLabel)
    expect(revisionDto.canResolve).toBe(false)
  })
})
