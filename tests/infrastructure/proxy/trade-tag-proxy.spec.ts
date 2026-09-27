import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TradeTagProxy } from '~/infrastructure/proxy/trade-tag-proxy'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import { TradeTagNotFoundError } from '~/domain/errors/trade-tag-not-found-error'
import { TradeTagNameConflictError } from '~/domain/errors/trade-tag-name-conflict-error'
import { TradeTagInUseError } from '~/domain/errors/trade-tag-in-use-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { signedInSessionStorage } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

function rejection(status: number, message: string) {
  return createFetchError({
    request: BASE_URL,
    options: {},
    response: { status, statusText: 'rejected', _data: { message } },
  } as unknown as FetchContext)
}

function proxy() {
  return new TradeTagProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TradeTagProxy', () => {
  it('列出標籤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{ id: 1, kind: 'mistake', name: '追價進場' }]))

    const tags = await proxy().listTags()

    expect(tags.map(tag => [tag.id, tag.kind, tag.name])).toEqual([[1, 'mistake', '追價進場']])
  })

  it('後端回空時是空清單', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))

    expect(await proxy().listTags()).toEqual([])
  })

  it('新增與改名打對的路', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ id: 6, kind: 'setup', name: '突破' })
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createTag(new TradeTagWriteDto('setup', '突破'))
    await proxy().renameTag(6, '突破回踩')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/users/me/trade-tags`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', body: { kind: 'setup', name: '突破' } })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${BASE_URL}/users/me/trade-tags/6`)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT', body: { name: '突破回踩' } })
  })

  it.each([
    ['使用中', 409, '還有 4 筆交易貼著它，請先從交易上移除或改名', TradeTagInUseError],
    ['找不到', 404, '找不到這個標籤', TradeTagNotFoundError],
    ['其他拒絕原樣帶回', 400, '標籤名稱不得為空白', BackendRequestRejectedError],
  ])('刪除時%s', async (_, status, message, expectedError) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(status, message)))

    const failure = await proxy().deleteTag(2).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(expectedError)
    expect((failure as Error).message).toBe(message)
  })

  it('撞名翻成名稱衝突', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(409, '已有同名的型態標籤')))

    await expect(proxy().createTag(new TradeTagWriteDto('setup', '突破'))).rejects.toBeInstanceOf(TradeTagNameConflictError)
  })

  it('連不上維持連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: BASE_URL, options: {}, error: new Error('fetch failed'),
    } as unknown as FetchContext)))

    await expect(proxy().renameTag(1, 'x')).rejects.toBeInstanceOf(BackendUnreachableError)
  })
})
