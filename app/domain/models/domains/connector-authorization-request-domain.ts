import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'

const UNNAMED_CONNECTOR_NAME = new LocalizedTextVo('未具名的外掛', 'Unnamed connector')

export class ConnectorAuthorizationRequestDomain {
  private readonly clientName: LocalizedTextVo

  // A connector may register without a name, and the consent page must still say who is asking.
  constructor(clientName: string) {
    const trimmedClientName = clientName.trim()
    this.clientName = trimmedClientName === ''
      ? UNNAMED_CONNECTOR_NAME
      : new UntranslatedTextVo(trimmedClientName)
  }

  toDto(): ConnectorAuthorizationRequestDto {
    return new ConnectorAuthorizationRequestDto(this.clientName)
  }
}
