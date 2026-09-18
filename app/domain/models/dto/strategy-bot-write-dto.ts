import type { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'

/**
 * DTO：表單交出來要存的那一台，還沒有被任何規則看過。
 *
 * 一個形狀同時服務新增與改寫，因為改寫會換掉一台機器人記得的每一樣東西——
 * 沒有哪一個欄位是進得去卻出不來的。`id` 有值就是改那一台，沒有就是新的一台。
 *
 * **規則是指名的，不是帶進來的。** 一個放不下條件的形狀，就是「一台機器人不會有
 * 自己的一份規則複本」這件事寫在型別上。
 *
 * **執行狀態、上次訊號、停擺原因也都不在這裡。** 那些是發生在一台機器人身上的事，
 * 不是誰填得了的欄位；一個放不下它們的形狀，就是「存一台機器人不可能把它啟動」
 * 這件事寫在型別上、而不是寫在讀這段程式的人腦子裡。
 */
export class StrategyBotWriteDto {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly symbol: string,
    public readonly tradingStrategyId: number,
    public readonly triggerIntervalMinutes: number,
    /**
     * 這台機器人每一輪要建議押多少、停在哪裡，**或 `null`**。
     *
     * `null` 就是不建議——而它同時是表單上那個區塊收著的意思。
     * 「使用者看得到的就是他要送的」寫在型別上：一份看不到的值沒有地方放。
     */
    public readonly positionPlan: PositionPlanDto | null,
  ) {}
}
