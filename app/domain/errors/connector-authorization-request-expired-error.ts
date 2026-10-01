import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ConnectorAuthorizationRequestExpiredError extends LocalizedError {
  constructor(options?: { cause?: unknown }) {
    const localizedMessage = new LocalizedTextVo(
      '這一張授權請求已失效或已被使用',
      'This authorization request has expired or was already used',
    )
    super(localizedMessage, options)
    this.name = 'ConnectorAuthorizationRequestExpiredError'
  }
}
