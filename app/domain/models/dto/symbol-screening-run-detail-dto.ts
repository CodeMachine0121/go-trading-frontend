import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { SymbolScreeningSnapshotDto } from '~/domain/models/dto/symbol-screening-snapshot-dto'
import type { SymbolScreeningCandidateDto } from '~/domain/models/dto/symbol-screening-candidate-dto'

export class SymbolScreeningRunDetailDto {
  constructor(
    public readonly run: SymbolScreeningRunDto,
    public readonly snapshot: SymbolScreeningSnapshotDto,
    public readonly candidates: readonly SymbolScreeningCandidateDto[],
  ) {}
}
