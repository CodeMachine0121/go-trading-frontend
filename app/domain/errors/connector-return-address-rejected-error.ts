import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ConnectorReturnAddressRejectedError extends LocalizedError {
  constructor() {
    const localizedMessage = new LocalizedTextVo(
      '交易服務給的返回位址不是信任的外掛位址',
      'The return address from the trading service is not a trusted connector address',
    )
    super(localizedMessage)
    this.name = 'ConnectorReturnAddressRejectedError'
  }
}
