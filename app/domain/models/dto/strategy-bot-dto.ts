import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import type { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'

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
    /**
     * 它現在在做什麼，**已經算成畫面直接畫得出來的樣子**：四種狀態哪一種、
     * 原因怎麼講、播放還是停止、編輯給不給按。
     */
    public readonly runState: StrategyBotRunStateDto,
  ) {}
}
