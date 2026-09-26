import type { ConnectorAuthorizationService } from '~/domain/service/connector-authorization-service'
import type { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'

export class ConnectorAuthorizationApplication {
  constructor(private readonly connectorAuthorizationService: ConnectorAuthorizationService) {}

  async loadAuthorizationRequest(requestId: string): Promise<ConnectorAuthorizationRequestDto> {
    return this.connectorAuthorizationService.readAuthorizationRequest(requestId)
  }

  async approveAuthorizationRequest(requestId: string): Promise<void> {
    await this.connectorAuthorizationService.approveAuthorizationRequest(requestId)
  }

  async denyAuthorizationRequest(requestId: string): Promise<void> {
    await this.connectorAuthorizationService.denyAuthorizationRequest(requestId)
  }
}
