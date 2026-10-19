import type { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import { SymbolScreeningSnapshotDto } from '~/domain/models/dto/symbol-screening-snapshot-dto'

export class SymbolScreeningSnapshot {
  constructor(
    public readonly profileName: string,
    public readonly terms: SymbolScreeningTerms,
  ) {}

  toDto(): SymbolScreeningSnapshotDto {
    return new SymbolScreeningSnapshotDto(this.profileName, this.terms.toDto())
  }
}
