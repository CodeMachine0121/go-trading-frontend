import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'

/**
 * DTO：表單交出來要存的那一台，還沒有被任何規則看過。
 *
 * 一個形狀同時服務新增與改寫，因為改寫會換掉一台機器人記得的每一樣東西——
 * 沒有哪一個欄位是進得去卻出不來的。`id` 有值就是改那一台，沒有就是新的一台。
 *
 * **執行狀態、上次訊號、停擺原因都不在這裡。** 那些是發生在一台機器人身上的事，
 * 不是誰填得了的欄位；一個放不下它們的形狀，就是「存一台機器人不可能把它啟動」
 * 這件事寫在型別上、而不是寫在讀這段程式的人腦子裡。
 */
export class StrategyBotWriteDto {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly symbol: string,
    public readonly triggerIntervalMinutes: number,
    public readonly signalSources: readonly StrategyBotSignalSourceDto[],
    public readonly buyCondition: StrategyBotConditionDto | null,
    public readonly sellCondition: StrategyBotConditionDto | null,
  ) {}
}
