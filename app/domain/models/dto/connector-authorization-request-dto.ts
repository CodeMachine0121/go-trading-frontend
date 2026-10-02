import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ConnectorAuthorizationRequestDto {
  constructor(public readonly clientName: LocalizedTextVo) {}
}
