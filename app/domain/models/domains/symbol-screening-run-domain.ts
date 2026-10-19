import type { SymbolScreeningRun } from '~/domain/models/entities/symbol-screening-run'
import { SymbolScreeningRunStatusDomain } from '~/domain/models/domains/symbol-screening-run-status-domain'
import { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'

export class SymbolScreeningRunDomain {
  private readonly status: SymbolScreeningRunStatusDomain

  constructor(private readonly run: SymbolScreeningRun) {
    this.status = new SymbolScreeningRunStatusDomain(run.status)
  }

  toDto(): SymbolScreeningRunDto {
    const failureReason = this.run.failureReason.trim()
    const contributionFailureReason = this.run.contributionFailureReason.trim()

    return new SymbolScreeningRunDto(
      this.run.id,
      this.run.profileName,
      this.status.value,
      this.status.label,
      this.status.tone,
      this.status.isActive,
      this.run.processedCandidateCount,
      this.run.candidateCount,
      failureReason === '' ? null : failureReason,
      contributionFailureReason === '' ? null : contributionFailureReason,
      this.run.submittedAt,
      this.run.finishedAt,
    )
  }
}
