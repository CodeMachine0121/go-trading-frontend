/**
 * VO：一次計算被拒絕時，系統交出來的那兩個根數。不可變、無行為。
 *
 * 兩個數字**一起**才說得出那句話，所以它們是一個值而不是兩個參數：
 * 只拿到「湊得出 19」說不出差多少，只拿到「至少要 20」說不出現在有幾根。
 * 它們也因此以一個值乘著拒絕往內傳，而不是讓拒絕的建構選項每次需求都變長。
 */
export class CandleCoverageShortfallVo {
  constructor(
    /** 走完的刻度區間目前湊得出幾根。 */
    public readonly availableCandleCount: number,
    /** 這支算法至少要幾根才算得出一個值。 */
    public readonly minimumCandleCount: number,
  ) {}
}
