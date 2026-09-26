// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IConnectorAuthorizationProxy } from '~/domain/interface/i-connector-authorization-proxy'
import type { IExternalNavigationProxy } from '~/domain/interface/i-external-navigation-proxy'
import { ConnectorAuthorizationApplication } from '~/application/connector-authorization-application'
import { ConnectorAuthorizationService } from '~/domain/service/connector-authorization-service'
import { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'
import { ConnectorAuthorizationRequestExpiredError } from '~/domain/errors/connector-authorization-request-expired-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'

const CONNECTOR_ADDRESS = 'http://127.0.0.1:33418/callback?code=one-time&state=xyz'
const DENIAL_ADDRESS = 'http://127.0.0.1:33418/callback?error=access_denied&state=xyz'
const UNREACHABLE_MESSAGE = '連不上交易服務（go-trading API），請確認它已啟動後再試一次。'

const connectorAuthorizationProxy = {
  fetchAuthorizationRequest: vi.fn<IConnectorAuthorizationProxy['fetchAuthorizationRequest']>(),
  approveAuthorizationRequest: vi.fn<IConnectorAuthorizationProxy['approveAuthorizationRequest']>(),
  denyAuthorizationRequest: vi.fn<IConnectorAuthorizationProxy['denyAuthorizationRequest']>(),
} satisfies IConnectorAuthorizationProxy

const externalNavigationProxy = {
  leaveFor: vi.fn<IExternalNavigationProxy['leaveFor']>(),
} satisfies IExternalNavigationProxy

function consentUnderTest() {
  return useConnectorAuthorization(new ConnectorAuthorizationApplication(
    new ConnectorAuthorizationService(connectorAuthorizationProxy, externalNavigationProxy)))
}

async function loadedConsent() {
  const consent = consentUnderTest()
  await consent.load('abc')

  return consent
}

beforeEach(() => {
  vi.resetAllMocks()
  connectorAuthorizationProxy.fetchAuthorizationRequest
    .mockResolvedValue(new ConnectorAuthorizationRequest('Claude Code'))
  connectorAuthorizationProxy.approveAuthorizationRequest.mockResolvedValue(CONNECTOR_ADDRESS)
  connectorAuthorizationProxy.denyAuthorizationRequest.mockResolvedValue(DENIAL_ADDRESS)
})

describe('useConnectorAuthorization：讀取授權請求', () => {
  it('請求有效時等他決定，並說得出外掛名稱', async () => {
    const { stage, authorizationRequest } = await loadedConsent()

    expect(stage.value).toBe('awaitingDecision')
    expect(authorizationRequest.value?.clientName).toBe('Claude Code')
    expect(connectorAuthorizationProxy.fetchAuthorizationRequest).toHaveBeenCalledWith('abc')
  })

  it('讀取中還沒有任何決定可按', () => {
    connectorAuthorizationProxy.fetchAuthorizationRequest.mockReturnValue(new Promise(() => {}))
    const { stage, load } = consentUnderTest()

    void load('abc')

    expect(stage.value).toBe('loading')
  })

  it('打開頁面只讀取，不替他允許也不替他拒絕', async () => {
    await loadedConsent()

    expect(connectorAuthorizationProxy.approveAuthorizationRequest).not.toHaveBeenCalled()
    expect(connectorAuthorizationProxy.denyAuthorizationRequest).not.toHaveBeenCalled()
    expect(externalNavigationProxy.leaveFor).not.toHaveBeenCalled()
  })

  it('過期或已被決定過的請求是已失效', async () => {
    connectorAuthorizationProxy.fetchAuthorizationRequest
      .mockRejectedValue(new ConnectorAuthorizationRequestExpiredError())

    const { stage } = await loadedConsent()

    expect(stage.value).toBe('expired')
  })

  it.each(['', '   '])('網址上沒有授權請求（%j）時是已失效，而且不問交易服務', async (requestId) => {
    const { stage, load } = consentUnderTest()

    await load(requestId)

    expect(stage.value).toBe('expired')
    expect(connectorAuthorizationProxy.fetchAuthorizationRequest).not.toHaveBeenCalled()
  })

  it('連不上時說連不上，不說已失效', async () => {
    connectorAuthorizationProxy.fetchAuthorizationRequest
      .mockRejectedValue(new BackendUnreachableError('http://localhost:8080'))

    const { stage, loadErrorMessage } = await loadedConsent()

    expect(stage.value).toBe('loadFailed')
    expect(loadErrorMessage.value).toBe(UNREACHABLE_MESSAGE)
  })

  it('交易服務自己壞掉時也給再試一次', async () => {
    connectorAuthorizationProxy.fetchAuthorizationRequest
      .mockRejectedValue(new BackendServerError('boom', { status: 500 }))

    const { stage, loadErrorMessage } = await loadedConsent()

    expect(stage.value).toBe('loadFailed')
    expect(loadErrorMessage.value).toBe('讀取授權請求時發生未預期的錯誤，請再試一次。')
  })

  it('再試一次重新讀取同一張請求，讀到了就等他決定', async () => {
    connectorAuthorizationProxy.fetchAuthorizationRequest
      .mockRejectedValueOnce(new BackendUnreachableError('http://localhost:8080'))
    const { stage, loadErrorMessage, retry } = await loadedConsent()

    await retry()

    expect(connectorAuthorizationProxy.fetchAuthorizationRequest).toHaveBeenLastCalledWith('abc')
    expect(stage.value).toBe('awaitingDecision')
    expect(loadErrorMessage.value).toBeNull()
  })
})

describe('useConnectorAuthorization：允許與拒絕', () => {
  it('允許之後把瀏覽器送回外掛給的位址，並說已交回', async () => {
    const { stage, approve } = await loadedConsent()

    await approve()

    expect(connectorAuthorizationProxy.approveAuthorizationRequest).toHaveBeenCalledWith('abc')
    expect(externalNavigationProxy.leaveFor).toHaveBeenCalledWith(CONNECTOR_ADDRESS)
    expect(stage.value).toBe('handedBack')
  })

  it('拒絕之後把瀏覽器送回外掛給的位址，並說已交回', async () => {
    const { stage, deny } = await loadedConsent()

    await deny()

    expect(connectorAuthorizationProxy.denyAuthorizationRequest).toHaveBeenCalledWith('abc')
    expect(externalNavigationProxy.leaveFor).toHaveBeenCalledWith(DENIAL_ADDRESS)
    expect(stage.value).toBe('handedBack')
  })

  it('送出中記得是哪一個決定', async () => {
    connectorAuthorizationProxy.approveAuthorizationRequest.mockReturnValue(new Promise(() => {}))
    const { pendingDecision, approve } = await loadedConsent()

    void approve()

    expect(pendingDecision.value).toBe('approve')
  })

  it('送出中再按允許或拒絕都不會送出第二次', async () => {
    let releaseApproval: (address: string) => void = () => {}
    connectorAuthorizationProxy.approveAuthorizationRequest.mockReturnValue(
      new Promise<string>((resolve) => {
        releaseApproval = resolve
      }))
    const { approve, deny } = await loadedConsent()

    const firstApproval = approve()
    await approve()
    await deny()
    releaseApproval(CONNECTOR_ADDRESS)
    await firstApproval

    expect(connectorAuthorizationProxy.approveAuthorizationRequest).toHaveBeenCalledTimes(1)
    expect(connectorAuthorizationProxy.denyAuthorizationRequest).not.toHaveBeenCalled()
    expect(externalNavigationProxy.leaveFor).toHaveBeenCalledTimes(1)
  })

  it('已交回之後不能再決定一次', async () => {
    const { approve, deny } = await loadedConsent()
    await approve()

    await deny()

    expect(connectorAuthorizationProxy.denyAuthorizationRequest).not.toHaveBeenCalled()
  })

  it('請求已失效時不能決定', async () => {
    connectorAuthorizationProxy.fetchAuthorizationRequest
      .mockRejectedValue(new ConnectorAuthorizationRequestExpiredError())
    const { approve } = await loadedConsent()

    await approve()

    expect(connectorAuthorizationProxy.approveAuthorizationRequest).not.toHaveBeenCalled()
  })

  it('停太久才按允許時說已失效，而且不送回外掛', async () => {
    connectorAuthorizationProxy.approveAuthorizationRequest
      .mockRejectedValue(new ConnectorAuthorizationRequestExpiredError())
    const { stage, approve } = await loadedConsent()

    await approve()

    expect(stage.value).toBe('expired')
    expect(externalNavigationProxy.leaveFor).not.toHaveBeenCalled()
  })

  it('按允許時連不上：說連不上、選擇恢復可按、不送回外掛', async () => {
    connectorAuthorizationProxy.approveAuthorizationRequest
      .mockRejectedValue(new BackendUnreachableError('http://localhost:8080'))
    const { stage, pendingDecision, decisionErrorMessage, approve } = await loadedConsent()

    await approve()

    expect(stage.value).toBe('awaitingDecision')
    expect(pendingDecision.value).toBeNull()
    expect(decisionErrorMessage.value).toBe(UNREACHABLE_MESSAGE)
    expect(externalNavigationProxy.leaveFor).not.toHaveBeenCalled()
  })

  it('交易服務沒接受這次決定時請他再試一次', async () => {
    connectorAuthorizationProxy.denyAuthorizationRequest
      .mockRejectedValue(new BackendServerError('boom', { status: 500 }))
    const { stage, decisionErrorMessage, deny } = await loadedConsent()

    await deny()

    expect(stage.value).toBe('awaitingDecision')
    expect(decisionErrorMessage.value).toBe('交易服務沒有接受這次決定，請再試一次。')
  })

  it('再決定一次時先清掉上一次的失敗說明', async () => {
    connectorAuthorizationProxy.approveAuthorizationRequest
      .mockRejectedValueOnce(new BackendUnreachableError('http://localhost:8080'))
    const { stage, decisionErrorMessage, approve } = await loadedConsent()
    await approve()

    await approve()

    expect(decisionErrorMessage.value).toBeNull()
    expect(stage.value).toBe('handedBack')
  })
})
