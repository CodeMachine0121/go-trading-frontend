import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ConnectorAuthorizationRequestExpiredError extends Error {
  readonly localizedMessage: LocalizedTextVo

  constructor(options?: { cause?: unknown }) {
    const localizedMessage = new LocalizedTextVo(
      '這一張授權請求已失效或已被使用',
      'This authorization request has expired or was already used',
    )
    super(localizedMessage.traditionalChinese, options)
    this.name = 'ConnectorAuthorizationRequestExpiredError'
    this.localizedMessage = localizedMessage
  }
}
