import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantConversationProxy } from '~/infrastructure/proxy/assistant-conversation-proxy'
import { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import { AssistantUnavailableError } from '~/domain/errors/assistant-unavailable-error'
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
  it('把回來的東西收成 entity', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      conversationId: 7,
      answer: '在盤整。',
      queryCount: 2,
      stoppedAtQueryLimit: false,
      usage: 3184,
    }))

    const answer = await new AssistantConversationProxy(BASE_URL).ask(askDomainOf(7))

    expect(answer.conversationId).toBe(7)
    expect(answer.answer).toBe('在盤整。')
    expect(answer.queryCount).toBe(2)
    expect(answer.usage).toBe(3184)
  })

  it('沒有指名對話時不送出那一格', async () => {
    // 送一個空的識別碼過去，後端會把它當成「指名了第 0 段」而找不到。
    const fetchMock = vi.fn().mockResolvedValue({
      conversationId: 1, answer: '好。', queryCount: 0, stoppedAtQueryLimit: false, usage: 100,
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new AssistantConversationProxy(BASE_URL).ask(askDomainOf(null))

    expect(fetchMock.mock.calls[0]?.[1]?.body).toEqual({ question: 'BTCUSDT 最近走勢如何' })
  })

  it('指名了就把它一起送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      conversationId: 7, answer: '好。', queryCount: 0, stoppedAtQueryLimit: false, usage: 100,
    })
    vi.stubGlobal('$fetch', fetchMock)

    await new AssistantConversationProxy(BASE_URL).ask(askDomainOf(7))

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
      name: '助手沒回應',
      status: 503,
      message: 'assistant unavailable: 助手目前沒有回應，請稍後再試',
      expectedError: AssistantUnavailableError,
    },
  ])('$name', async ({ status, message, expectedError }) => {
    // 三者對使用者的意義完全不同：開一段新的、等到重置、稍後再試。
    // 合成一種的代價是有人對著一個要等到明天的拒絕重試一整個小時。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status, message })))

    await expect(new AssistantConversationProxy(BASE_URL).ask(askDomainOf()))
      .rejects.toBeInstanceOf(expectedError)
  })

  it('拒絕的原因如實轉達', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 429,
      message: '今日助手用量額度 300000 已用盡，於 2026-09-05T00:00:00Z 重置',
    })))

    await expect(new AssistantConversationProxy(BASE_URL).ask(askDomainOf()))
      .rejects.toThrow('2026-09-05T00:00:00Z')
  })

  it('後端自己壞了不說成助手不在', async () => {
    // 後端讀不到資料庫時，使用者等一位其實好好的助手是白等。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 502, message: 'storage unavailable',
    })))

    await expect(new AssistantConversationProxy(BASE_URL).ask(askDomainOf()))
      .rejects.toBeInstanceOf(BackendServerError)
  })

  it('提問本身被拒絕時維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 400, message: 'assistant ask is empty: 必須寫點什麼才問得起來',
    })))

    await expect(new AssistantConversationProxy(BASE_URL).ask(askDomainOf()))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('連不上後端與被拒絕是兩件事', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new AssistantConversationProxy(BASE_URL).ask(askDomainOf()))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('AssistantConversationProxy.listConversations', () => {
  it('每一段收成 entity，時刻收成瞬間', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      { id: 2, lastActiveAt: '2026-09-04T10:30:00Z', messageCount: 4 },
      { id: 1, lastActiveAt: '2026-09-04T09:00:00Z', messageCount: 2 },
    ]))

    const summaries = await new AssistantConversationProxy(BASE_URL).listConversations()

    expect(summaries.map(summary => summary.id)).toEqual([2, 1])
    expect(summaries[0]?.lastActiveAt).toEqual(new Date('2026-09-04T10:30:00Z'))
  })

  it('一段都沒有是空陣列', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    await expect(new AssistantConversationProxy(BASE_URL).listConversations()).resolves.toEqual([])
  })
})

describe('AssistantConversationProxy.getConversation', () => {
  it('每一則收成 entity', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7,
      lastActiveAt: '2026-09-04T10:30:00Z',
      messages: [
        { role: 'ask', content: '問 1', createdAt: '2026-09-04T10:00:00Z' },
        { role: 'answer', content: '答 1', createdAt: '2026-09-04T10:01:00Z' },
      ],
    }))

    const conversation = await new AssistantConversationProxy(BASE_URL).getConversation(7)

    expect(conversation.messages.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(conversation.messages[0]?.createdAt).toEqual(new Date('2026-09-04T10:00:00Z'))
  })

  it('來歷不明的那一則當成助手說的，不憑空替使用者發言', async () => {
    // 畫錯位置比替使用者發言輕微得多。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 7,
      lastActiveAt: '2026-09-04T10:30:00Z',
      messages: [{ role: 'something-new', content: '?', createdAt: '2026-09-04T10:00:00Z' }],
    }))

    const conversation = await new AssistantConversationProxy(BASE_URL).getConversation(7)

    expect(conversation.messages[0]?.role).toBe('answer')
  })

  it('那一段不在了以自己的錯誤拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({
      status: 404, message: '找不到識別碼為 99 的對話',
    })))

    await expect(new AssistantConversationProxy(BASE_URL).getConversation(99))
      .rejects.toBeInstanceOf(ConversationNotFoundError)
  })
})
