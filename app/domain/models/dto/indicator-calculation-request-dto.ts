import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import type { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'

/**
 * DTO：使用者在指標計算表單裡打的原始輸入。
 * 算式只收**內容**：外框不是使用者輸入的東西，它由 domain 依指標值種類產生。
 *
 * 交易標的、彙總刻度與觀察區間是同一類東西：**這一次要怎麼算**。
 * 它們一起住在這裡而不是散在策略身上，所以同一支算法能在不同市場、不同粗細下反覆執行。
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
     * 要跑的那一段算式**內容**。指標計算畫面走這一條：使用者在編輯器裡寫了什麼就跑什麼，
     * 不必先存成策略。
     *
     * 與 `strategyId` **恰好挑一種**。兩個都給，就說不出實際跑的是哪一個。
     */
    public readonly scriptBody: string,
    public readonly resultType: string,
    /** 這支算式的旋鈕。空的一份代表一支沒有旋鈕的算式。 */
    public readonly parameters: readonly StrategyParameterDto[] = [],
    /**
     * 要跑的是**哪一支已存的策略**。K 線圖表走這一條：那裡套用的是一支已經定案的策略，
     * 而它可能是從市集加入來的——那種**沒有算式可以送**，指名它是唯一跑得動的方式。
     *
     * 與 `scriptBody` 恰好挑一種。
     */
    public readonly strategyId?: number,
  ) {}
}
