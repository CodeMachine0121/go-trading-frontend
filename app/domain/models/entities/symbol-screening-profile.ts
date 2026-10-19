import type { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import type { SymbolScreeningParameterValueVo } from '~/domain/models/vo/symbol-screening-parameter-value-vo'
import { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'

export class SymbolScreeningProfile {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly strategyScriptId: number,
    public readonly parameterValues: readonly SymbolScreeningParameterValueVo[],
    public readonly terms: SymbolScreeningTerms,
  ) {}

  toDto(): SymbolScreeningProfileDto {
    return new SymbolScreeningProfileDto(
      this.id, this.name, this.strategyScriptId, this.parameterValues, this.terms.toDomain().toDto())
  }
}
