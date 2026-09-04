// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantAnswerDto } from '~/domain/models/dto/assistant-answer-dto'
import { ConversationDto } from '~/domain/models/dto/conversation-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { AssistantUnavailableError } from '~/domain/errors/assistant-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'

const MOMENT = new Date('2026-09-04T10:00:00.000Z')

const applicationMock = {
  ask: vi.fn(),
  listConversations: vi.fn(),
  getConversation: vi.fn(),
}

/**
 * 替身從參數進去，不去換掉 `useNuxtApp`——換掉它會連測試環境自己要用的
 * 路由同步一起弄壞。共用狀態（`useState`）走的是真的 Nuxt runtime。
 */
function conversationUnderTest() {
  return useAssistantConversation(
    applicationMock as unknown as Parameters<typeof useAssistantConversation>[0])
}

function answerOf(conversationId = 7, content = '在盤整。'): AssistantAnswerDto {
  return new AssistantAnswerDto(
    conversationId, content, new MessageContentDomain(content).toBlocks(), 2, false, 3184)
}

/**
 * 每個案例都從乾淨的共用狀態開始。它是跨畫面共用的一份，
 * 所以不清掉的話上一個案例問過的話會留到下一個案例。
 */
beforeEach(() => {
  vi.clearAllMocks()
  applicationMock.listConversations.mockResolvedValue([])
  conversationUnderTest().startNewConversation()
})

describe('useAssistantConversation 問一句', () => {
  it('提問先上對話串，回答回來才接在後面', async () => {
    // 等待可能長達兩分鐘，那兩分鐘裡使用者得看得到自己問了什麼。
    applicationMock.ask.mockResolvedValue(answerOf())
    const { messages, ask } = conversationUnderTest()

    await ask('BTCUSDT 最近走勢如何')

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(messages.value[0]?.blocks[0]?.lines[0]?.[0]?.text).toBe('BTCUSDT 最近走勢如何')
  })

  it('回答帶著附註，因為那組數字現在拿得到', async () => {
    applicationMock.ask.mockResolvedValue(answerOf())
    const { messages, ask } = conversationUnderTest()

    await ask('問一句')

    expect(messages.value[1]?.note?.label).toBe('查了 2 次 · 份量 3184')
  })

  it('第一句問完就記住這一段是哪一段', async () => {
    // 之後的每一句都要追加在同一段，而不是每一句都開一段新的。
    applicationMock.ask.mockResolvedValue(answerOf(42))
    const { conversationId, ask } = conversationUnderTest()

    await ask('問一句')

    expect(conversationId.value).toBe(42)
  })

  it('送出後輸入框清空', async () => {
    applicationMock.ask.mockResolvedValue(answerOf())
    const { draft, ask } = conversationUnderTest()
    draft.value = '問一句'

    await ask(draft.value)

    expect(draft.value).toBe('')
  })

  it('說了等於沒說的一句連呼叫都不發生', async () => {
    const { messages, ask } = conversationUnderTest()

    await ask('   ')

    expect(applicationMock.ask).not.toHaveBeenCalled()
    expect(messages.value).toEqual([])
  })

  it('答完就重讀清單，新的那一段才會出現在最前面', async () => {
    applicationMock.ask.mockResolvedValue(answerOf())
    applicationMock.listConversations.mockResolvedValue([
      new ConversationSummaryDto(7, MOMENT, 2),
    ])
    const { conversations, ask } = conversationUnderTest()

    await ask('問一句')

    expect(conversations.value.map(summary => summary.id)).toEqual([7])
  })
})

describe('useAssistantConversation 被拒絕時', () => {
  it.each([
    {
      name: '額度用盡',
      error: new DailyUsageAllowanceExhaustedError('今日助手用量額度已用盡，於 2026-09-05T00:00:00Z 重置'),
      expectedMessage: '2026-09-05T00:00:00Z',
    },
    {
      name: '助手沒回應',
      error: new AssistantUnavailableError('助手目前沒有回應，請稍後再試'),
      expectedMessage: '請稍後再試',
    },
    {
      name: '連不上後端',
      error: new BackendUnreachableError('http://localhost:8080'),
      expectedMessage: '連不上後端',
    },
    {
      name: '意料之外的錯',
      error: new Error('boom'),
      expectedMessage: 'boom',
    },
  ])('$name 各自說出自己那一句', async ({ error, expectedMessage }) => {
    // 四種分開，因為使用者要做的事不同：等到重置、稍後再試、去啟動後端、或這是個意外。
    applicationMock.ask.mockRejectedValue(error)
    const { rejectionMessage, ask } = conversationUnderTest()

    await ask('問一句')

    expect(rejectionMessage.value).toContain(expectedMessage)
  })

  it('連錯誤都不是的東西也說得出一句話', async () => {
    // 不論丟上來的是什麼，畫面都得說一句人看得懂的話，不能是一片空白。
    applicationMock.ask.mockRejectedValue('這不是一個 Error')
    const { rejectionMessage, ask } = conversationUnderTest()

    await ask('問一句')

    expect(rejectionMessage.value).toContain('未預期的錯誤')
  })

  it('那一句回到輸入框，可以改一改再送', async () => {
    applicationMock.ask.mockRejectedValue(new AssistantUnavailableError('沒回應'))
    const { draft, ask } = conversationUnderTest()

    await ask('BTCUSDT 最近走勢如何')

    expect(draft.value).toBe('BTCUSDT 最近走勢如何')
  })

  it('對話串上的提問留著——警示塊就長在它下面', async () => {
    applicationMock.ask.mockRejectedValue(new AssistantUnavailableError('沒回應'))
    const { messages, ask } = conversationUnderTest()

    await ask('問一句')

    expect(messages.value.map(message => message.role)).toEqual(['ask'])
  })

  it('再試一次重送同一句，不會多一則提問', async () => {
    // 再放一則提問會讓使用者以為自己問了兩次。
    applicationMock.ask.mockRejectedValueOnce(new AssistantUnavailableError('沒回應'))
    applicationMock.ask.mockResolvedValueOnce(answerOf())
    const { messages, rejectionMessage, ask, retry } = conversationUnderTest()

    await ask('問一句')
    await retry()

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(rejectionMessage.value).toBeNull()
    expect(applicationMock.ask).toHaveBeenCalledTimes(2)
  })

  it('還沒問過任何一句時，再試一次什麼都不做', async () => {
    const { retry } = conversationUnderTest()

    await retry()

    expect(applicationMock.ask).not.toHaveBeenCalled()
  })
})

describe('useAssistantConversation 等待狀態', () => {
  it('等待中是等待中，答完就不是了', async () => {
    // 它在共用狀態裡，所以切走再回來不會重送，抽屜與整頁看到的也是同一個等待。
    let resolveAsk: (value: AssistantAnswerDto) => void = () => {}
    applicationMock.ask.mockReturnValue(new Promise<AssistantAnswerDto>((resolve) => {
      resolveAsk = resolve
    }))
    const { pending, ask } = conversationUnderTest()

    const asking = ask('問一句')
    expect(pending.value).toBe(true)

    resolveAsk(answerOf())
    await asking
    expect(pending.value).toBe(false)
  })

  it('被拒絕之後也不再是等待中', async () => {
    applicationMock.ask.mockRejectedValue(new AssistantUnavailableError('沒回應'))
    const { pending, ask } = conversationUnderTest()

    await ask('問一句')

    expect(pending.value).toBe(false)
  })
})

describe('useAssistantConversation 換對話', () => {
  it('挑一段就把它的每一則讀回來', async () => {
    applicationMock.getConversation.mockResolvedValue(new ConversationDto(7, MOMENT, [
      new ConversationMessageDto('ask', '問 1', new MessageContentDomain('問 1').toBlocks(), MOMENT),
      new ConversationMessageDto('answer', '答 1', new MessageContentDomain('答 1').toBlocks(), MOMENT),
    ]))
    const { conversationId, messages, selectConversation } = conversationUnderTest()

    await selectConversation(7)

    expect(conversationId.value).toBe(7)
    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    // 讀回來的每一則都沒有附註——那組數字後端不會再回。
    expect(messages.value.every(message => message.note === null)).toBe(true)
  })

  it('那一段不在了就明說並退回一段新的', async () => {
    // 停在一個讀不到內容的對話上，使用者只會反覆按它。
    applicationMock.getConversation.mockRejectedValue(new ConversationNotFoundError('找不到'))
    const { conversationId, messages, rejectionMessage, selectConversation } = conversationUnderTest()

    await selectConversation(99)

    expect(conversationId.value).toBeNull()
    expect(messages.value).toEqual([])
    expect(rejectionMessage.value).toContain('找不到這段對話')
  })

  it('開新對話把畫面清回起點，清單不動', async () => {
    applicationMock.ask.mockResolvedValue(answerOf())
    const { messages, conversationId, draft, ask, startNewConversation } = conversationUnderTest()
    await ask('問一句')

    startNewConversation()

    expect(messages.value).toEqual([])
    expect(conversationId.value).toBeNull()
    expect(draft.value).toBe('')
  })
})

describe('useAssistantConversation 對話清單', () => {
  it('讀得到就照後端給的順序放著', async () => {
    applicationMock.listConversations.mockResolvedValue([
      new ConversationSummaryDto(2, MOMENT, 4),
      new ConversationSummaryDto(1, MOMENT, 2),
    ])
    const { conversations, conversationsErrorMessage, loadConversations } = conversationUnderTest()

    await loadConversations()

    expect(conversations.value.map(summary => summary.id)).toEqual([2, 1])
    expect(conversationsErrorMessage.value).toBeNull()
  })

  it('取不到與一段都沒有是兩個狀態', async () => {
    // 用一個空清單同時表示兩者，會讓後端掛掉時看起來像「你還沒問過任何問題」。
    applicationMock.listConversations.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080'))
    const { conversations, conversationsErrorMessage, loadConversations } = conversationUnderTest()

    await loadConversations()

    expect(conversations.value).toEqual([])
    expect(conversationsErrorMessage.value).toContain('連不上後端')
  })
})
