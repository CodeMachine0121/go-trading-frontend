import type { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'
import type { ConnectorAuthorizationStageVo } from '~/domain/models/vo/connector-authorization-stage-vo'
import type { ConnectorAuthorizationDecisionVo } from '~/domain/models/vo/connector-authorization-decision-vo'
import { ConnectorAuthorizationRequestExpiredError } from '~/domain/errors/connector-authorization-request-expired-error'
import { ConnectorReturnAddressRejectedError } from '~/domain/errors/connector-return-address-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { SignedOutError } from '~/domain/errors/signed-out-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export function useConnectorAuthorization(
  connectorAuthorizationApplication = useNuxtApp().$connectorAuthorizationApplication,
) {
  const { translatedText } = useLocalizedText()
  const stage = ref<ConnectorAuthorizationStageVo>('loading')
  const authorizationRequest = ref<ConnectorAuthorizationRequestDto | null>(null)
  const pendingDecision = ref<ConnectorAuthorizationDecisionVo | null>(null)
  const loadErrorMessage = ref<LocalizedTextVo | null>(null)
  const decisionErrorMessage = ref<LocalizedTextVo | null>(null)
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
        ? translatedText('shell.connectorAuthorization.unreachable')
        : translatedText('shell.connectorAuthorization.loadFailed')
      stage.value = 'loadFailed'
    }
  }

  async function decide(decision: ConnectorAuthorizationDecisionVo): Promise<void> {
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
      else if (error instanceof ConnectorReturnAddressRejectedError) {
        stage.value = 'returnAddressRejected'
      }
      else if (!(error instanceof SignedOutError)) {
        decisionErrorMessage.value = error instanceof BackendUnreachableError
          ? translatedText('shell.connectorAuthorization.unreachable')
          : translatedText('shell.connectorAuthorization.decisionRejected')
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
