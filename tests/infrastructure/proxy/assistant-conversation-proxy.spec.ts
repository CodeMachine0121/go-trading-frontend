import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantConversationProxy } from '~/infrastructure/proxy/assistant-conversation-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import { AssistantAnswerInProgressError } from '~/domain/errors/assistant-answer-in-progress-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'

const BASE_URL = 'http://localhost:8080'

function askDomainOf(conversationId: number | null = null): AssistantAskDomain {
  return new AssistantAskDomain(new AssistantAskDto(conversationId, 'BTCUSDT 最近走勢如何'))
}

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AssistantConversationProxy.ask', () => {
  it('收回來的是「去哪裡找答案」,不是答案', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      conversationId: 7,
      turnId: 9,
      status: 'running',
    }))

    const started = await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf(7))

    expect(started.conversationId).toBe(7)
    expect(started.turnId).toBe(9)
    expect(started.status).toBe('running')
  })

  it('認不出來的狀態當成失敗', async () => {
    // 當成進行中會是一個永遠轉不完的圈,而且那一段再也送不出下一句;
    // 當成失敗最壞的情況只是叫使用者再問一次。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      conversationId: 7, turnId: 9, status: 'something-new',
    }))

    const started = await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf(7))

    expect(started.status).toBe('failed')
  })

  it('沒有指名對話時不送出那一格', async () => {
    // 送一個空的識別碼過去，後端會把它當成「指名了第 0 段」而找不到。
    const fetchMock = vi.fn().mockResolvedValue({ conversationId: 1, turnId: 9, status: 'running' })
    vi.stubGlobal('$fetch', fetchMock)

    await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf(null))

    expect(fetchMock.mock.calls[0]?.[1]?.body).toEqual({ question: 'BTCUSDT 最近走勢如何' })
  })

  it('指名了就把它一起送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ conversationId: 7, turnId: 9, status: 'running' })
    vi.stubGlobal('$fetch', fetchMock)

    await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf(7))

    expect(fetchMock.mock.calls[0]?.[1]?.body).toEqual({
      conversationId: 7,
      question: 'BTCUSDT 最近走勢如何',
    })
  })
})

describe('AssistantConversationProxy 把拒絕分成使用者做得出決定的幾種', () => {
  it.each([
    {
      name: '那一段對話不在了',
      status: 404,
      message: 'conversation not found: 找不到識別碼為 99 的對話',
      expectedError: ConversationNotFoundError,
    },
    {
      name: '今日額度用盡',
      status: 429,
      message: 'daily usage allowance exhausted: 今日助手用量額度 300000 已用盡，於 2026-09-05T00:00:00Z 重置',
      expectedError: DailyUsageAllowanceExhaustedError,
    },
    {
      name: '那一段上前一則還在寫',
      status: 409,
      message: 'assistant answer in progress: 這段對話上還有一則回答正在進行中，請等它結束再問下一句',
      expectedError: AssistantAnswerInProgressError,
    },
  ])('$name', async ({ status, message, expectedError }) => {
    // 三者對使用者的意義完全不同：開一段新的、等到重置、等一下前一則。
    // 合成一種的代價是有人對著一個要等到明天的拒絕重試一整個小時。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status, message })))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf()))
      .rejects.toBeInstanceOf(expectedError)
  })

  it('拒絕的原因如實轉達', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 429,
      message: '今日助手用量額度 300000 已用盡，於 2026-09-05T00:00:00Z 重置',
    })))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf()))
      .rejects.toThrow('2026-09-05T00:00:00Z')
  })

  it('後端自己壞了維持後端自己的故障', async () => {
    // 助手不可用已經不從這條路出來：後端收下提問就回,那時它還沒去問助手。
    // 它會變成那一則的失敗原因,從讀回來的對話裡看得到。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 502, message: 'storage unavailable',
    })))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf()))
      .rejects.toBeInstanceOf(BackendServerError)
  })

  it('提問本身被拒絕時維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 400, message: 'assistant ask is empty: 必須寫點什麼才問得起來',
    })))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf()))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('連不上後端與被拒絕是兩件事', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).ask(askDomainOf()))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('AssistantConversationProxy.listConversations', () => {
  it('每一段收成 entity，時刻收成瞬間', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      { id: 2, lastActiveAt: '2026-09-04T10:30:00Z', messageCount: 4 },
      { id: 1, lastActiveAt: '2026-09-04T09:00:00Z', messageCount: 2 },
    ]))

    const summaries = await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).listConversations()

    expect(summaries.map(summary => summary.id)).toEqual([2, 1])
    expect(summaries[0]?.lastActiveAt).toEqual(new Date('2026-09-04T10:30:00Z'))
  })

  it('一段都沒有是空陣列', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).listConversations()).resolves.toEqual([])
  })
})

describe('AssistantConversationProxy.getConversation', () => {
  it('每一則收成 entity', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7,
      lastActiveAt: '2026-09-04T10:30:00Z',
      messages: [
        { role: 'ask', content: '問 1', createdAt: '2026-09-04T10:00:00Z', status: 'answered' },
        {
          role: 'answer', content: '答 1', createdAt: '2026-09-04T10:01:00Z', status: 'answered',
          queryCount: 2, stoppedAtQueryLimit: true, usage: 3184,
        },
      ],
    }))

    const conversation = await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).getConversation(7)

    expect(conversation.messages.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(conversation.messages[0]?.createdAt).toEqual(new Date('2026-09-04T10:00:00Z'))
    expect(conversation.messages[1]?.queryCount).toBe(2)
    expect(conversation.messages[1]?.stoppedAtQueryLimit).toBe(true)
    expect(conversation.messages[1]?.usage).toBe(3184)
  })

  it('還在寫的那一則與壞掉的那一則各自帶著自己的狀態', async () => {
    // 這是「重新整理之後還看得到」所依賴的那一個欄位。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7,
      lastActiveAt: '2026-09-04T10:30:00Z',
      messages: [
        {
          role: 'ask', content: '壞掉的', createdAt: '2026-09-04T10:00:00Z',
          status: 'failed', failureReason: '助手目前沒有回應，請稍後再試',
        },
        { role: 'ask', content: '還在寫的', createdAt: '2026-09-04T10:01:00Z', status: 'running' },
      ],
    }))

    const conversation = await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).getConversation(7)

    expect(conversation.messages[0]?.status).toBe('failed')
    expect(conversation.messages[0]?.failureReason).toBe('助手目前沒有回應，請稍後再試')
    expect(conversation.messages[1]?.status).toBe('running')
    // 後端在那幾則上不給這些欄位,收進來要有明確的預設而不是 undefined。
    expect(conversation.messages[1]?.failureReason).toBe('')
    expect(conversation.messages[1]?.queryCount).toBe(0)
  })

  it('來歷不明的那一則當成助手說的，不憑空替使用者發言', async () => {
    // 畫錯位置比替使用者發言輕微得多。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7,
      lastActiveAt: '2026-09-04T10:30:00Z',
      messages: [{
        role: 'something-new', content: '?', createdAt: '2026-09-04T10:00:00Z', status: 'answered',
      }],
    }))

    const conversation = await new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).getConversation(7)

    expect(conversation.messages[0]?.role).toBe('answer')
  })

  it('那一段不在了以自己的錯誤拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 404, message: '找不到識別碼為 99 的對話',
    })))

    await expect(new AssistantConversationProxy(BASE_URL, signedInSessionStorage()).getConversation(99))
      .rejects.toBeInstanceOf(ConversationNotFoundError)
  })
})
