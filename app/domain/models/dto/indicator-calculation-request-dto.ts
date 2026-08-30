/**
 * DTO：使用者在指標計算表單裡打的原始輸入。
 * 計算根數刻意是字串——使用者可能留空或打 `2.5`，解讀與拒絕是 domain 的事。
 */
export class IndicatorCalculationRequestDto {
  constructor(
    public readonly symbol: string,
    public readonly candleCount: string,
    public readonly script: string,
  ) {}
}
