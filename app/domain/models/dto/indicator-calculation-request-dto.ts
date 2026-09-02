/**
 * DTO：使用者在指標計算表單裡打的原始輸入。
 * 計算根數刻意是字串——使用者可能留空或打 `2.5`，解讀與拒絕是 domain 的事。
 * 算式只收**內容**：外框不是使用者輸入的東西，它由 domain 依指標值種類產生。
 */
export class IndicatorCalculationRequestDto {
  constructor(
    public readonly symbol: string,
    public readonly candleCount: string,
    public readonly scriptBody: string,
    public readonly resultType: string,
  ) {}
}
