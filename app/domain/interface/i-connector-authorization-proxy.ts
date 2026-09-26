import type { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'

export interface IConnectorAuthorizationProxy {
  fetchAuthorizationRequest(requestId: string): Promise<ConnectorAuthorizationRequest>

  /** Resolves with the connector address the browser must go to next. */
  approveAuthorizationRequest(requestId: string): Promise<string>

  /** Resolves with the connector address the browser must go to next. */
  denyAuthorizationRequest(requestId: string): Promise<string>
}
