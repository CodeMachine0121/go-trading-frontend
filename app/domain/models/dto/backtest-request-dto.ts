import type Decimal from 'decimal.js'
import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

/**
 * DTO：使用者在回測那一格填的原始輸入。
 *
 * 算式、參數、市場與彙總刻度都在裡面，儘管它們是與指標預覽共用的那一份——
 * 共用的是**畫面上的狀態**，送出去的仍然是一次完整的請求。
 * 少送一樣就得有人記得補，而那個人遲早會忘。
 */
export class BacktestRequestDto {
  constructor(
    public readonly symbol: string,
    public readonly aggregationInterval: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly scriptBody: string,
    /**
     * 這支算式宣告的指標值種類。
     *
     * 它跟著送進來而不是由回測自己假定，因為工作區是兩個去處共用的：
     * 假定一種，就等於在使用者沒有改任何東西的情況下換掉他的算式外框，
     * 而換出來的東西編不過——那時他看到的會是直譯器的抱怨，不是一句他讀得懂的話。
     */
    public readonly resultType: string,
    /** 這支算式的旋鈕。空的一份代表一支沒有旋鈕的算式。 */
    public readonly parameters: readonly StrategyParameterDto[],
    public readonly initialCapital: Decimal,
    public readonly positionSizingMode: PositionSizingMode,
    /** 押注模式不需要數字時（全押）它被忽略，因此填什麼都不影響結果。 */
    public readonly positionSizingValue: Decimal,
  ) {}
}
