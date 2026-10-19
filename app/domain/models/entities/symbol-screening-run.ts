import { SymbolScreeningRunDomain } from '~/domain/models/domains/symbol-screening-run-domain'

export class SymbolScreeningRun {
  constructor(
    public readonly id: number,
    public readonly profileName: string,
    public readonly status: string,
    public readonly processedCandidateCount: number,
    public readonly candidateCount: number,
    public readonly failureReason: string,
    public readonly contributionFailureReason: string,
    public readonly submittedAt: Date,
    public readonly finishedAt: Date | null,
  ) {}

  toDomain(): SymbolScreeningRunDomain {
    return new SymbolScreeningRunDomain(this)
  }
}
