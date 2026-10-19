import type { SymbolScreeningCandidateStatus } from '~/domain/models/vo/symbol-screening-candidate-status-vo'
import type { SymbolScreeningTone } from '~/domain/models/vo/symbol-screening-tone-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { SymbolScreeningSegmentDto } from '~/domain/models/dto/symbol-screening-segment-dto'
import type { SymbolScreeningContributionDto } from '~/domain/models/dto/symbol-screening-contribution-dto'

export class SymbolScreeningCandidateDto {
  constructor(
    public readonly symbol: string,
    public readonly status: SymbolScreeningCandidateStatus,
    public readonly statusLabel: LocalizedTextVo,
    public readonly statusTone: SymbolScreeningTone,
    public readonly stageLabel: LocalizedTextVo | null,
    public readonly reason: string | null,
    public readonly recommendationRank: number | null,
    public readonly historyDays: number | null,
    public readonly averageDailyQuoteVolumeText: string | null,
    public readonly segments: readonly SymbolScreeningSegmentDto[],
    public readonly returnWithoutBestSegmentText: string | null,
    public readonly contribution: SymbolScreeningContributionDto | null,
  ) {}
}
