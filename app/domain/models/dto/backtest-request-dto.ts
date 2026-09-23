import type Decimal from 'decimal.js'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
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
    /** 要重演的那**一整份**算式——畫面上看到的那一份，逐字送出。 */
    public readonly script: string,
    /**
     * 這支算式宣告的指標值種類。
     *
     * 它跟著送進來而不是由回測自己假定，因為工作區是兩個去處共用的：
     * 假定一種，就等於在使用者沒有改任何東西的情況下改掉他的進入點簽章，
     * 而換出來的東西編不過——那時他看到的會是直譯器的抱怨，不是一句他讀得懂的話。
     */
    public readonly resultType: string,
    /** 這支算式的旋鈕。空的一份代表一支沒有旋鈕的算式。 */
    public readonly parameters: readonly StrategyScriptParameterDto[],
    public readonly initialCapital: Decimal,
    public readonly positionSizingMode: PositionSizingMode,
    /** 押注模式不需要數字時（全押）它被忽略，因此填什麼都不影響結果。 */
    public readonly positionSizingValue: Decimal,
    /**
     * 這一次要模擬的止損距離（百分點，從**進場價**量起）。
     *
     * **留白就是完全不模擬止損**——不是套用一個常見的預設值。
     * 這兩格跟著這一次走，與初始資金、押多少同一類；
     * 它們與一台機器人身上同名的那兩格**不是同一件事**（那一組從最新價量起）。
     */
    public readonly stopLossPercentage: Decimal,
    /** 這一次要模擬的止盈距離，規則與止損一字不差，方向相反。 */
    public readonly takeProfitPercentage: Decimal,
    /**
     * 這一次開倉要付的手續費，佔**押注金額**的百分點。
     *
     * **留白就是完全不收費**——不是套用一個常見的費率。不收費的那一張成績單
     * 講的是一個交易免費的世界，而它偏樂觀的程度與這支策略多常交易成正比。
     */
    public readonly entryCostPercentage: Decimal,
    /**
     * 這一次平倉要付的手續費與稅，佔**成交金額**的百分點。
     *
     * **留白時沿用進場成本率**——這一點與隔壁那兩個出場距離**不一樣**
     * （那兩格各自獨立）。這兩格是同一件事的兩半：幣安兩邊一樣只要填一格，
     * 台股買賣不對稱才要填兩格。
     */
    public readonly exitCostPercentage: Decimal,
    /**
     * 指名一支已經存在的策略腳本來回測，而不是自帶一段算式。
     *
     * 從市集加入的那些**沒有算式可以送**——指名是它們唯一回測得了的方式；
     * 指名時 `script` 留空，那一段從頭到尾不離開系統。
     */
    public readonly strategyScriptId?: number,
  ) {}
}
