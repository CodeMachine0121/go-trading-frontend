import { ConnectorAuthorizationRequestDomain } from '~/domain/models/domains/connector-authorization-request-domain'

export class ConnectorAuthorizationRequest {
  constructor(public readonly clientName: string) {}

  toDomain(): ConnectorAuthorizationRequestDomain {
    return new ConnectorAuthorizationRequestDomain(this.clientName)
  }
}
