import type Decimal from 'decimal.js'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

/**
 * DTO：使用者在重演一份交易策略那一格填的原始輸入。
 *
 * **沒有彙總刻度、沒有算式，也沒有交易模式。** 那三樣都是那份交易策略自己說的——
 * 這裡留一格給它們，就等於畫面上會有兩個答案而沒有規則說哪一個贏。
 *
 * 交易模式那一格更嚴重一點：後端已經不收它了，留著會讓使用者挑了現貨、
 * 拿到多空反手的成績單，而畫面上那顆按鈕還亮著現貨。
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
  ) {}
}
