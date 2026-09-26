import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectorAuthorizationProxy } from '~/infrastructure/proxy/connector-authorization-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { ConnectorAuthorizationRequestExpiredError } from '~/domain/errors/connector-authorization-request-expired-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'

const BASE_URL = 'http://localhost:8080'
const CONNECTOR_ADDRESS = 'http://127.0.0.1:33418/callback?code=one-time&state=xyz'

function buildFetchError(status?: number) {
  const context = status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: { status, statusText: 'rejected', _data: { message: 'not found' } },
      }

  return createFetchError(context as unknown as FetchContext)
}

function proxy() {
  return new ConnectorAuthorizationProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ConnectorAuthorizationProxy.fetchAuthorizationRequest', () => {
  it('讀回授權請求，留下外掛名稱', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      clientName: 'Claude Code', expiresAt: '2026-09-27T10:10:00Z',
    })
    vi.stubGlobal('$fetch', fetchStub)

    const authorizationRequest = await proxy().fetchAuthorizationRequest('abc')

    expect(authorizationRequest.clientName).toBe('Claude Code')
    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/oauth/authorization-requests/abc`,
      expect.objectContaining({ method: 'GET' }))
  })

  it('沒給外掛名稱時當成空的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ expiresAt: '2026-09-27T10:10:00Z' }))

    const authorizationRequest = await proxy().fetchAuthorizationRequest('abc')

    expect(authorizationRequest.clientName).toBe('')
  })

  it('授權請求識別經過跳脫，永遠只是一段路徑', async () => {
    const fetchStub = vi.fn().mockResolvedValue({ clientName: 'Claude Code' })
    vi.stubGlobal('$fetch', fetchStub)

    await proxy().fetchAuthorizationRequest('a/b?c')

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/oauth/authorization-requests/a%2Fb%3Fc`, expect.anything())
  })

  it('讀取時找不到就是已失效', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(404)))

    await expect(proxy().fetchAuthorizationRequest('abc'))
      .rejects.toBeInstanceOf(ConnectorAuthorizationRequestExpiredError)
  })
})

describe.each([
  { name: 'approveAuthorizationRequest', suffix: 'approval' },
  { name: 'denyAuthorizationRequest', suffix: 'denial' },
] as const)('ConnectorAuthorizationProxy.$name', ({ name, suffix }) => {
  it(`送到 ${suffix}，交回外掛的位址`, async () => {
    const fetchStub = vi.fn().mockResolvedValue({ redirectTo: CONNECTOR_ADDRESS })
    vi.stubGlobal('$fetch', fetchStub)

    const address = await proxy()[name]('abc')

    expect(address).toBe(CONNECTOR_ADDRESS)
    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/oauth/authorization-requests/abc/${suffix}`,
      expect.objectContaining({ method: 'POST' }))
  })

  it('不存在、過期或已被決定過的請求一律是已失效', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(404)))

    await expect(proxy()[name]('abc'))
      .rejects.toBeInstanceOf(ConnectorAuthorizationRequestExpiredError)
  })

  it('連不上維持連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError()))

    await expect(proxy()[name]('abc')).rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('後端自己壞掉維持後端壞掉', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(500)))

    await expect(proxy()[name]('abc')).rejects.toBeInstanceOf(BackendServerError)
  })
})
