import { StrategyBotDomain } from '~/domain/models/domains/strategy-bot-domain'
import type { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/**
 * Entity：後端那一台機器人的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * 它記的是**機器的事**：叫什麼、盯哪裡、多久醒一次、現在在不在跑。
 * 規則住在它指名的那一份交易策略裡，所以好幾台可以用同一份。
 *
 * 「一台機器人在清單上該長什麼樣」是領域行為，住在 StrategyBotDomain：
 * 四種狀態哪一種、停擺原因怎麼講、播放還是停止、編輯給不給按。
 */
export class StrategyBot {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly symbol: string,
    public readonly triggerIntervalMinutes: number,
    /** 它照哪一份交易策略跑。規則不長在機器人身上——那是交易策略的事。 */
    public readonly tradingStrategyId: number,
    /**
     * 那一份現在叫什麼。每次讀都跟著回來，不是抄一份存著——
     * 抄了的話，改過名字的那一刻清單上就會有一台機器人說著舊名字。
     */
    public readonly tradingStrategyName: string,
    public readonly runState: StrategyBotRunStateVo,
    public readonly lastSentSignal: string,
    public readonly haltReason: StrategyBotHaltReasonVo | null,
    public readonly conflicting: boolean,
    /**
     * 這台機器人每一輪要建議押多少、停在哪裡。**沒填過的那一台是 `null`**。
     *
     * 它在機器人身上而不在交易策略身上：同一套規則盯 BTC 與盯台積電，
     * 押的錢與能忍的幅度本來就不同，那是機器的事。
     */
    public readonly positionPlan: PositionPlanDto | null,
    /** 現貨機器人（K 線）或合約機器人（合約行情）。舊版後端沒說的一律是現貨。 */
    public readonly marketDataKind: MarketDataKind = 'kCandle',
  ) {}

  toDomain(): StrategyBotDomain {
    return new StrategyBotDomain(this)
  }
}
