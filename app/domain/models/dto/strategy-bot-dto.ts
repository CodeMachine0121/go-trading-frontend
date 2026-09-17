import type { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'

/**
 * DTO：一台機器人交給畫面的樣子。
 *
 * 後半那一項——執行狀態——跟前半一起來，因為清單是用來回答一個問題的：
 * **哪一台該管一下**。分開問的話，畫面要嘛多問 N 次，要嘛就是那一欄不顯示。
 *
 * 交易策略的名字也跟著回來，理由一樣：清單上看得到「這台照哪一套規則跑」，
 * 才不必一台一台打開。
 */
export class StrategyBotDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly symbol: string,
    public readonly triggerIntervalMinutes: number,
    public readonly tradingStrategyId: number,
    public readonly tradingStrategyName: string,
    /**
     * 它現在在做什麼，**已經算成畫面直接畫得出來的樣子**：四種狀態哪一種、
     * 原因怎麼講、播放還是停止、編輯給不給按。
     */
    public readonly runState: StrategyBotRunStateDto,
  ) {}
}
