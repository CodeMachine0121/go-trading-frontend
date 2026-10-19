import type { SymbolScreeningTermsDto } from '~/domain/models/dto/symbol-screening-terms-dto'

export class SymbolScreeningSnapshotDto {
  constructor(
    public readonly profileName: string,
    public readonly terms: SymbolScreeningTermsDto,
  ) {}
}
