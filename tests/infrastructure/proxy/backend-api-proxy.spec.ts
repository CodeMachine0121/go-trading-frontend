import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantConversationProxy } from '~/infrastructure/proxy/assistant-conversation-proxy'
import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'

// 「畫面正在等」是在發請求的那一層報到的。這一組經由兩支真的 proxy 來問它——
// 那一層本身是抽象的，而它的行為只有透過繼承它的 proxy 才看得到。

const BASE_URL = 'http://localhost:8080'

const CONVERSATION_WIRE = { id: 5, lastActiveAt: '2026-09-23T10:00:00.000Z', messages: [] }

function rejectionOf(status: number) {
  return createFetchError({
    request: BASE_URL,
    options: {},
    response: { status, statusText: 'rejected', _data: { message: '不行' } },
  } as unknown as FetchContext)
}

/** 一次報到：`beginWaiting` 被叫到時交出去的那個「結束了」也是替身，才數得到它被叫了幾次。 */
function waitingProbe() {
  const endWaiting = vi.fn()
  const beginWaiting = vi.fn(() => endWaiting)

  return { beginWaiting, endWaiting }
}

function conversationProxy(
  beginWaiting: () => () => void,
  recoverSession: () => Promise<boolean> = async () => false,
) {
  return new AssistantConversationProxy(
    BASE_URL, signedInSessionStorage(), new BackendRequestHooks(vi.fn(), recoverSession, beginWaiting))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BackendApiProxy：使用者在等的那一發要報到', () => {
  it('一發送出去、還沒回來時，已經報到而且還沒結束', async () => {
    const { beginWaiting, endWaiting } = waitingProbe()
    vi.stubGlobal('$fetch', vi.fn(() => new Promise(() => {})))

    void conversationProxy(beginWaiting).getConversation(5)
    await Promise.resolve()

    expect(beginWaiting).toHaveBeenCalledTimes(1)
    expect(endWaiting).not.toHaveBeenCalled()
  })

  it('那一發回來之後結束一次', async () => {
    const { beginWaiting, endWaiting } = waitingProbe()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(CONVERSATION_WIRE))

    await conversationProxy(beginWaiting).getConversation(5)

    expect(endWaiting).toHaveBeenCalledTimes(1)
  })

  it('那一發失敗時照樣結束一次，而失敗照舊往上拋', async () => {
    const { beginWaiting, endWaiting } = waitingProbe()
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(400)))

    await expect(conversationProxy(beginWaiting).getConversation(5))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
    expect(endWaiting).toHaveBeenCalledTimes(1)
  })

  it('過期、救回、重送成功——對使用者是同一件事，只報到一次', async () => {
    const { beginWaiting, endWaiting } = waitingProbe()
    vi.stubGlobal('$fetch', vi.fn()
      .mockRejectedValueOnce(rejectionOf(401))
      .mockResolvedValueOnce(CONVERSATION_WIRE))

    await conversationProxy(beginWaiting, async () => true).getConversation(5)

    expect(beginWaiting).toHaveBeenCalledTimes(1)
    expect(endWaiting).toHaveBeenCalledTimes(1)
  })

  it('「是不是背景的」不是給後端的，不跟著送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue(CONVERSATION_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await conversationProxy(vi.fn(() => () => {})).refreshConversation(5)

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('background')
  })
})

describe('BackendApiProxy：連線燈的檢查是使用者在等的', () => {
  it('連線燈的檢查報到——它不定期去問，只在打開時與按下重新檢查時才問', async () => {
    const { beginWaiting, endWaiting } = waitingProbe()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ status: 'Healthy' }))

    await new BackendHealthProxy(
      BASE_URL, signedInSessionStorage(), new BackendRequestHooks(vi.fn(), async () => false, beginWaiting))
      .fetchBackendHealth()

    expect(beginWaiting).toHaveBeenCalledTimes(1)
    expect(endWaiting).toHaveBeenCalledTimes(1)
  })
})

describe('BackendApiProxy：背景的那幾發不報到', () => {
  it('助手作答中的回頭詢問不報到', async () => {
    const { beginWaiting } = waitingProbe()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(CONVERSATION_WIRE))

    await conversationProxy(beginWaiting).refreshConversation(5)

    expect(beginWaiting).not.toHaveBeenCalled()
  })
})
