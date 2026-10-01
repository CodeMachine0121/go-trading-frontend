import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class BinanceTradingKeyDto {
  constructor(
    public readonly configured: boolean,
    public readonly apiKeySummary: LocalizedTextVo | null,
    public readonly tradableMarketsLabel: LocalizedTextVo,
    public readonly configuredAt: Date | null,
  ) {}
}
