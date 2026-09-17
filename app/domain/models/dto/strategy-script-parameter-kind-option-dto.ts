import type { StrategyScriptParameterKind } from '~/domain/models/dto/strategy-script-parameter-dto'

/** DTO：種類選單上的一個選項。畫面以 value 指名，不以 label——文字是給人看的。 */
export class StrategyScriptParameterKindOptionDto {
  constructor(
    public readonly value: StrategyScriptParameterKind,
    public readonly label: string,
  ) {}
}
