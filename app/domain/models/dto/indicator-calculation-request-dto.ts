import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import type { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/**
 * DTO：使用者在指標計算表單裡打的原始輸入。
 * 算式收的是**一整份**：畫面上看到的那一份就是送出去的那一份，domain 不替它補任何一行。
 *
 * 交易標的、彙總刻度與觀察區間是同一類東西：**這一次要怎麼算**。
 * 它們一起住在這裡而不是散在策略腳本身上，所以同一支算法能在不同市場、不同粗細下反覆執行。
 */
export class IndicatorCalculationRequestDto {
  constructor(
    public readonly symbol: string,
    public readonly aggregationInterval: string,
    /**
     * 要看哪一段行情。
     *
     * 兩個呼叫端天生知道的東西不同：圖表知道使用者正在看哪一段，指標計算畫面知道
     * 使用者想看多長。**換算寫在各自那一邊**——兩者都交出同一種形狀進來，
     * 這裡就不必為兩種來源各留一個欄位，下游也只認得一種。
     *
     * 它**不是**「幾格」：一段裡有幾格取決於那個市場在這段時間裡實際開了多久，
     * 而那是系統才答得出來的事。
     */
    public readonly observationWindow: ObservationWindowVo,
    /**
     * 要跑的那**一整份**算式。指標計算畫面走這一條：使用者在編輯器裡寫了什麼就跑什麼，
     * 不必先存成策略腳本。
     *
     * 與 `strategyScriptId` **恰好挑一種**。兩個都給，就說不出實際跑的是哪一個。
     */
    public readonly script: string,
    public readonly resultType: string,
    /** 這支算式的旋鈕。空的一份代表一支沒有旋鈕的算式。 */
    public readonly parameters: readonly StrategyScriptParameterDto[] = [],
    /**
     * 要跑的是**哪一支已存的策略腳本**。K 線圖表走這一條：那裡套用的是一支已經定案的策略腳本，
     * 而它可能是從市集加入來的——那種**沒有算式可以送**，指名它是唯一跑得動的方式。
     *
     * 與 `script` 恰好挑一種。
     */
    public readonly strategyScriptId?: number,
    /**
     * 這一次要算哪一種行情：現貨 K 線，或合約行情格。它決定計算送到哪裡、
     * 標的是哪一份清單上的。沒說時是 K 線——K 線圖表與既有的呼叫端都是這一種。
     */
    public readonly marketDataKind: MarketDataKind = 'kCandle',
  ) {}
}
