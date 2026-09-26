import type { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'
import type { ConnectorAuthorizationStage } from '~/domain/models/vo/connector-authorization-stage'
import type { ConnectorAuthorizationDecision } from '~/domain/models/vo/connector-authorization-decision'
import { ConnectorAuthorizationRequestExpiredError } from '~/domain/errors/connector-authorization-request-expired-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const UNREACHABLE_MESSAGE = '連不上交易服務（go-trading API），請確認它已啟動後再試一次。'

export function useConnectorAuthorization(
  connectorAuthorizationApplication = useNuxtApp().$connectorAuthorizationApplication,
) {
  const stage = ref<ConnectorAuthorizationStage>('loading')
  const authorizationRequest = ref<ConnectorAuthorizationRequestDto | null>(null)
  const pendingDecision = ref<ConnectorAuthorizationDecision | null>(null)
  const loadErrorMessage = ref<string | null>(null)
  const decisionErrorMessage = ref<string | null>(null)
  const requestId = ref('')

  async function load(targetRequestId: string): Promise<void> {
    requestId.value = targetRequestId
    stage.value = 'loading'
    loadErrorMessage.value = null

    try {
      authorizationRequest.value
        = await connectorAuthorizationApplication.readAuthorizationRequest(targetRequestId)
      stage.value = 'awaitingDecision'
    }
    catch (error: unknown) {
      if (error instanceof ConnectorAuthorizationRequestExpiredError) {
        stage.value = 'expired'
        return
      }

      loadErrorMessage.value = error instanceof BackendUnreachableError
        ? UNREACHABLE_MESSAGE
        : '讀取授權請求時發生未預期的錯誤，請再試一次。'
      stage.value = 'loadFailed'
    }
  }

  async function decide(decision: ConnectorAuthorizationDecision): Promise<void> {
    if (stage.value !== 'awaitingDecision' || pendingDecision.value !== null) {
      return
    }

    pendingDecision.value = decision
    decisionErrorMessage.value = null

    try {
      if (decision === 'approve') {
        await connectorAuthorizationApplication.approveAuthorizationRequest(requestId.value)
      }
      else {
        await connectorAuthorizationApplication.denyAuthorizationRequest(requestId.value)
      }
      stage.value = 'handedBack'
    }
    catch (error: unknown) {
      if (error instanceof ConnectorAuthorizationRequestExpiredError) {
        stage.value = 'expired'
      }
      else {
        decisionErrorMessage.value = error instanceof BackendUnreachableError
          ? UNREACHABLE_MESSAGE
          : '交易服務沒有接受這次決定，請再試一次。'
      }
    }
    finally {
      pendingDecision.value = null
    }
  }

  return {
    stage,
    authorizationRequest,
    pendingDecision,
    loadErrorMessage,
    decisionErrorMessage,
    load,
    retry: () => load(requestId.value),
    approve: () => decide('approve'),
    deny: () => decide('deny'),
  }
}
