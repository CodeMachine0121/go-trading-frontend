import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class AutoOrderRefusalDto {
  constructor(
    public readonly strategyBotId: number,
    public readonly message: LocalizedTextVo,
    public readonly offersBinanceTradingKeySettings: boolean,
  ) {}
}
