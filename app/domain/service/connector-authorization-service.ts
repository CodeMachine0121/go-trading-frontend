import type { IConnectorAuthorizationProxy } from '~/domain/interface/i-connector-authorization-proxy'
import type { IExternalNavigationProxy } from '~/domain/interface/i-external-navigation-proxy'
import type { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'
import { ConnectorAuthorizationRequestExpiredError } from '~/domain/errors/connector-authorization-request-expired-error'

export class ConnectorAuthorizationService {
  constructor(
    private readonly connectorAuthorizationProxy: IConnectorAuthorizationProxy,
    private readonly externalNavigationProxy: IExternalNavigationProxy,
  ) {}

  async readAuthorizationRequest(requestId: string): Promise<ConnectorAuthorizationRequestDto> {
    if (requestId.trim() === '') {
      throw new ConnectorAuthorizationRequestExpiredError()
    }

    const authorizationRequest
      = await this.connectorAuthorizationProxy.fetchAuthorizationRequest(requestId)

    return authorizationRequest.toDomain().toDto()
  }

  async approveAuthorizationRequest(requestId: string): Promise<void> {
    this.externalNavigationProxy.leaveFor(
      await this.connectorAuthorizationProxy.approveAuthorizationRequest(requestId))
  }

  async denyAuthorizationRequest(requestId: string): Promise<void> {
    this.externalNavigationProxy.leaveFor(
      await this.connectorAuthorizationProxy.denyAuthorizationRequest(requestId))
  }
}
