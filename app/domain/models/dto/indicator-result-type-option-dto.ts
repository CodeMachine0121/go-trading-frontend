import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'

/** DTO：指標值種類清單上的一個選項。 */
export class IndicatorResultTypeOptionDto {
  constructor(
    public readonly value: IndicatorResultType,
    public readonly label: string,
  ) {}
}
