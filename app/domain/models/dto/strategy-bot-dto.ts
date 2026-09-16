import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'

/**
 * DTO：一台機器人交給畫面的樣子。
 *
 * 後半那四項——執行狀態、上次訊號、停擺原因、有沒有打架——跟前半一起來，
 * 因為清單是用來回答一個問題的：**哪一台該管一下**。
 * 分開問的話，畫面要嘛多問 N 次，要嘛就是那一欄不顯示。
 */
export class StrategyBotDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly symbol: string,
    public readonly triggerIntervalMinutes: number,
    public readonly signalSources: readonly StrategyBotSignalSourceDto[],
    public readonly buyCondition: StrategyBotConditionDto | null,
    public readonly sellCondition: StrategyBotConditionDto | null,
    public readonly runState: StrategyBotRunStateVo,
    /** 最近一次**真的送出去**的信號。沒送過是一種狀態，不是空白。 */
    public readonly lastSentSignal: string,
    /** 系統自己停下它的原因。它的擁有者停的、或它還在跑時為 null。 */
    public readonly haltReason: StrategyBotHaltReasonVo | null,
    /** 上一輪買入與賣出條件同時成立。**不是停擺**——機器人還在跑。 */
    public readonly conflicting: boolean,
  ) {}
}
