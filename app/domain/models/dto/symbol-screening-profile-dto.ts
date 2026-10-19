import type { SymbolScreeningTermsDto } from '~/domain/models/dto/symbol-screening-terms-dto'
import type { SymbolScreeningParameterValueVo } from '~/domain/models/vo/symbol-screening-parameter-value-vo'

export class SymbolScreeningProfileDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly strategyScriptId: number,
    public readonly parameterValues: readonly SymbolScreeningParameterValueVo[],
    public readonly terms: SymbolScreeningTermsDto,
  ) {}
}
