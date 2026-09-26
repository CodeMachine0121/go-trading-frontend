import { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'

const UNNAMED_CONNECTOR_NAME = '未具名的外掛'

export class ConnectorAuthorizationRequestDomain {
  private readonly clientName: string

  // A connector may register without a name, and the consent page must still say who is asking.
  constructor(clientName: string) {
    const trimmedClientName = clientName.trim()
    this.clientName = trimmedClientName === '' ? UNNAMED_CONNECTOR_NAME : trimmedClientName
  }

  toDto(): ConnectorAuthorizationRequestDto {
    return new ConnectorAuthorizationRequestDto(this.clientName)
  }
}
