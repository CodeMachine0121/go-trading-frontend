import type { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'

export interface IConnectorAuthorizationProxy {
  fetchAuthorizationRequest(requestId: string): Promise<ConnectorAuthorizationRequest>

  approveAuthorizationRequest(requestId: string): Promise<string>

  denyAuthorizationRequest(requestId: string): Promise<string>
}
