import type { SymbolScreeningRun } from '~/domain/models/entities/symbol-screening-run'
import type { SymbolScreeningSnapshot } from '~/domain/models/entities/symbol-screening-snapshot'
import type { SymbolScreeningCandidate } from '~/domain/models/entities/symbol-screening-candidate'
import { SymbolScreeningRunDetailDto } from '~/domain/models/dto/symbol-screening-run-detail-dto'

export class SymbolScreeningRunDetail {
  constructor(
    public readonly run: SymbolScreeningRun,
    public readonly snapshot: SymbolScreeningSnapshot,
    public readonly candidates: readonly SymbolScreeningCandidate[],
  ) {}

  toDto(): SymbolScreeningRunDetailDto {
    return new SymbolScreeningRunDetailDto(
      this.run.toDomain().toDto(),
      this.snapshot.toDto(),
      this.candidates.map(candidate => candidate.toDomain().toDto()),
    )
  }
}
