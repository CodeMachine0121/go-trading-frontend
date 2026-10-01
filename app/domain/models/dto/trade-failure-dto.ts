import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class TradeFailureDto {
  constructor(
    public readonly message: LocalizedTextVo,
    public readonly unreachable: boolean,
  ) {}
}
