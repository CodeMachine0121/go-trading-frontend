import type Decimal from 'decimal.js'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { FillTiming } from '~/domain/models/vo/fill-timing-vo'

/**
 * DTO：使用者在重演一份交易策略那一格填的原始輸入。
 *
 * **沒有彙總刻度、沒有算式，也沒有交易模式。** 那三樣都是那份交易策略自己說的——
 * 這裡留一格給它們，就等於畫面上會有兩個答案而沒有規則說哪一個贏。
 *
 * 交易模式那一格更嚴重一點：後端已經不收它了，留著會讓使用者挑了現貨、
 * 拿到一張與畫面上寫的對不起來的成績單。
 */
export class TradingStrategyBacktestRequestDto {
  constructor(
    public readonly tradingStrategyId: number,
    public readonly symbol: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
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
     * 這一次要付的兩個費率。**留白就是完全不收費**；
     * 出場那格留白時沿用進場——與上面那兩個出場距離不一樣。
     */
    public readonly entryCostPercentage: Decimal,
    public readonly exitCostPercentage: Decimal,
    /** 信號在哪一個價格成交。沒動即收盤成交。 */
    public readonly fillTiming: FillTiming = 'close',
    /** 切出調參段與驗證段的那一刻；`null` 即不切分。 */
    public readonly validationStartTime: Date | null = null,
  ) {}
}
