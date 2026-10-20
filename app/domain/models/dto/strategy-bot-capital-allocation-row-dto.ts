import type Decimal from 'decimal.js'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class StrategyBotCapitalAllocationRowDto {
  constructor(
    public readonly symbol: string,
    public readonly allocatedCapital: Decimal | null,
    public readonly shortfallLabel: LocalizedTextVo | null,
  ) {}
}
