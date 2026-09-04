import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

/**
 * DTO：使用者在指標計算表單裡打的原始輸入。
 * 算式只收**內容**：外框不是使用者輸入的東西，它由 domain 依指標值種類產生。
 *
 * 交易標的、彙總刻度與計算根數是同一類東西：**這一次要怎麼算**。
 * 它們一起住在這裡而不是散在策略身上，所以同一支算法能在不同市場、不同粗細下反覆執行。
 */
export class IndicatorCalculationRequestDto {
  constructor(
    public readonly symbol: string,
    public readonly aggregationInterval: string,
    /**
     * 要幾格有值。
     *
     * 兩個呼叫端天生知道的東西不同：圖表知道它畫得出幾格，指標計算畫面知道
     * 使用者想看多長。**換算是畫面那一側的事**——它問過之後交一個數字進來，
     * 這裡就不必為兩種來源各留一個欄位。
     */
    public readonly candleCount: number,
    public readonly scriptBody: string,
    public readonly resultType: string,
    /** 這支算式的旋鈕。空的一份代表一支沒有旋鈕的算式。 */
    public readonly parameters: readonly StrategyParameterDto[] = [],
    /**
     * 算到哪個時間為止。`null` 代表算到現在——指標計算畫面一律如此，
     * 圖表則指定它畫得到的右緣，因為它要的是**圖上那一段**的指標，不是此刻的。
     */
    public readonly endTime: Date | null = null,
  ) {}
}
