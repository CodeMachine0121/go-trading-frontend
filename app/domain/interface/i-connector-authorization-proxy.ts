import type { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'
import type { ConnectorReturnAddressVo } from '~/domain/models/vo/connector-return-address-vo'

export interface IConnectorAuthorizationProxy {
  fetchAuthorizationRequest(requestId: string): Promise<ConnectorAuthorizationRequest>

  approveAuthorizationRequest(requestId: string): Promise<ConnectorReturnAddressVo>

  denyAuthorizationRequest(requestId: string): Promise<ConnectorReturnAddressVo>
}
