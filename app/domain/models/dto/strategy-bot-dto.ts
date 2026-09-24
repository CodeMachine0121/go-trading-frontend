import type { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import type { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

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
    /**
     * 這台機器人每一輪要建議押多少、停在哪裡。**沒填過的那一台是 `null`**。
     *
     * 表單靠它決定那個區塊打開時是展開還是收著——有值而收著等於藏起來，
     * 而藏起來的值會在某天變成一個他不記得填過的數字。
     */
    public readonly positionPlan: PositionPlanDto | null,
    /** 現貨機器人或合約機器人。 */
    public readonly marketDataKind: MarketDataKind = 'kCandle',
    /** 標的在清單上怎麼說：合約機器人的後面標出「永續合約」。 */
    public readonly symbolLabel: string = symbol,
    /** 合約機器人有建議部位時的「N 倍」；其餘一律 `null`，那一列就不提槓桿。 */
    public readonly leverageLabel: string | null = null,
    /** 這一台的編輯頁——在它自己那一種的畫面底下。 */
    public readonly editPath: string = `/strategy-bots/${id}`,
  ) {}
}
