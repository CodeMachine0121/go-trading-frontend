import type Decimal from 'decimal.js'
import type { SymbolScreeningSegmentFindingVo } from '~/domain/models/vo/symbol-screening-segment-finding-vo'
import type { SymbolScreeningContributionVo } from '~/domain/models/vo/symbol-screening-contribution-vo'
import { SymbolScreeningCandidateDomain } from '~/domain/models/domains/symbol-screening-candidate-domain'

export class SymbolScreeningCandidate {
  constructor(
    public readonly symbol: string,
    public readonly position: number,
    public readonly status: string,
    public readonly stage: string,
    public readonly reason: string,
    public readonly recommendationRank: number | null,
    public readonly historyDays: number | null,
    public readonly averageDailyQuoteVolume: Decimal | null,
    public readonly segments: readonly SymbolScreeningSegmentFindingVo[],
    public readonly returnWithoutBestSegment: number | null,
    public readonly contribution: SymbolScreeningContributionVo | null,
  ) {}

  toDomain(): SymbolScreeningCandidateDomain {
    return new SymbolScreeningCandidateDomain(this)
  }
}
