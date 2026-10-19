import type { SymbolScreeningRunStatus } from '~/domain/models/vo/symbol-screening-run-status-vo'
import type { SymbolScreeningTone } from '~/domain/models/vo/symbol-screening-tone-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SymbolScreeningRunDto {
  constructor(
    public readonly id: number,
    public readonly profileName: string,
    public readonly status: SymbolScreeningRunStatus,
    public readonly statusLabel: LocalizedTextVo,
    public readonly statusTone: SymbolScreeningTone,
    public readonly isActive: boolean,
    public readonly processedCandidateCount: number,
    public readonly candidateCount: number,
    public readonly failureReason: string | null,
    public readonly contributionFailureReason: string | null,
    public readonly submittedAt: Date,
    public readonly finishedAt: Date | null,
  ) {}
}
