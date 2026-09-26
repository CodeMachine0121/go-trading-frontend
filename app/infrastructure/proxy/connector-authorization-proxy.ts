import type { IConnectorAuthorizationProxy } from '~/domain/interface/i-connector-authorization-proxy'
import { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { ConnectorAuthorizationRequestExpiredError } from '~/domain/errors/connector-authorization-request-expired-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const AUTHORIZATION_REQUESTS_ENDPOINT = '/oauth/authorization-requests'

const NOT_FOUND_STATUS = 404

type AuthorizationRequestWire = {
  clientName?: string
}

type AuthorizationDecisionWire = {
  redirectTo: string
}

export class ConnectorAuthorizationProxy extends BackendApiProxy implements IConnectorAuthorizationProxy {
  async fetchAuthorizationRequest(requestId: string): Promise<ConnectorAuthorizationRequest> {
    const wire = await this.requestAuthorization<AuthorizationRequestWire>(
      this.authorizationRequestPath(requestId), 'GET')

    return new ConnectorAuthorizationRequest(wire.clientName ?? '')
  }

  async approveAuthorizationRequest(requestId: string): Promise<string> {
    const wire = await this.requestAuthorization<AuthorizationDecisionWire>(
      `${this.authorizationRequestPath(requestId)}/approval`, 'POST')

    return wire.redirectTo
  }

  async denyAuthorizationRequest(requestId: string): Promise<string> {
    const wire = await this.requestAuthorization<AuthorizationDecisionWire>(
      `${this.authorizationRequestPath(requestId)}/denial`, 'POST')

    return wire.redirectTo
  }

  private authorizationRequestPath(requestId: string): string {
    return `${AUTHORIZATION_REQUESTS_ENDPOINT}/${encodeURIComponent(requestId)}`
  }

  private async requestAuthorization<TWire>(path: string, method: 'GET' | 'POST'): Promise<TWire> {
    try {
      return await this.requestBackend<TWire>(path, { method })
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError && error.status === NOT_FOUND_STATUS) {
        throw new ConnectorAuthorizationRequestExpiredError(error.message, { cause: error })
      }

      throw error
    }
  }
}
