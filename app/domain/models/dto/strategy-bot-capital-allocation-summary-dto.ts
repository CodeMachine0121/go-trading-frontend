import type Decimal from 'decimal.js'
import type { StrategyBotCapitalAllocationRowDto } from '~/domain/models/dto/strategy-bot-capital-allocation-row-dto'

export class StrategyBotCapitalAllocationSummaryDto {
  constructor(
    public readonly totalPercentage: Decimal,
    public readonly unallocatedPercentage: Decimal,
    public readonly isOverAllocated: boolean,
    public readonly rows: readonly StrategyBotCapitalAllocationRowDto[],
  ) {}
}
