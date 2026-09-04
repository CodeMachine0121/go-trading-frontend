import type { StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'

/** DTO：種類選單上的一個選項。畫面以 value 指名，不以 label——文字是給人看的。 */
export class StrategyParameterKindOptionDto {
  constructor(
    public readonly value: StrategyParameterKind,
    public readonly label: string,
  ) {}
}
