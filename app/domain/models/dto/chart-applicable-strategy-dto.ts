import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

/**
 * DTO：一支可以套到 K 線圖上的策略——圖表需要的全部，以及只有這些。
 *
 * 它存在是為了說出一句一直是真的、但從來沒有寫下來的話：**圖表套用一支策略，
 * 從來不需要它的算式。** 圖表要的是「哪一支」、「叫什麼」、「算出來的是哪一種值」、
 * 「有哪些旋鈕」與「畫不畫得成線」；算式屬於執行那一端，而執行只要有識別碼就夠了。
 *
 * 這句話從前只是碰巧成立，現在是必須成立的：從市集加入來的策略**沒有算式**，
 * 而它照樣套得上圖。把圖表的需求縮到這個形狀，那件事就不必再靠任何人記得。
 *
 * 兩種來源都轉得出它：自己的策略與市集上的策略各自在自己身上有一個轉換。
 */
export class ChartApplicableStrategyDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly resultType: string,
    /** 這支算式宣告的旋鈕與它們的預設值。套用時每一筆各自調各自的。 */
    public readonly parameters: readonly StrategyParameterDto[],
    /**
     * 這一支在圖表上畫不畫得成線。**是非畫不出來**——一個是非沒有數值可以擺在價格軸上。
     * 挑策略時就據此擋下，比套用後才失敗誠實。
     */
    public readonly drawableOnChart: boolean,
    /** 這一支是不是從市集加入的。畫面據此標明它是誰的東西。 */
    public readonly adopted: boolean,
  ) {}
}
