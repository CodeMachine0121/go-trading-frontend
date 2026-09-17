import { StrategyBotDomain } from '~/domain/models/domains/strategy-bot-domain'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'

/**
 * Entity：後端那一台機器人的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
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
    public readonly signalSources: readonly StrategyBotSignalSource[],
    /** 兩棵條件樹。後端保證兩邊都不為空，但讀回來的是資料，所以這裡仍然允許沒有。 */
    public readonly buyCondition: StrategyBotCondition | null,
    public readonly sellCondition: StrategyBotCondition | null,
    public readonly runState: StrategyBotRunStateVo,
    public readonly lastSentSignal: string,
    public readonly haltReason: StrategyBotHaltReasonVo | null,
    public readonly conflicting: boolean,
  ) {}

  toDomain(): StrategyBotDomain {
    return new StrategyBotDomain(this)
  }
}

/**
 * Entity：一個信號來源。**沒有 script 欄位**——不是留空，是這個形狀裡沒有那一格。
 */
export class StrategyBotSignalSource {
  constructor(
    public readonly label: string,
    public readonly strategyScriptId: number,
    public readonly aggregationInterval: string,
    public readonly parameterValues: readonly StrategyBotParameterValue[],
  ) {}
}

/** Entity：一個旋鈕在這個來源裡調到多少。 */
export class StrategyBotParameterValue {
  constructor(
    public readonly name: string,
    public readonly value: number,
  ) {}
}

/**
 * Entity：一個條件節點，遞迴。
 *
 * 一個形狀同時是群組與一句比對，而 `operator` 有沒有值就是分辨的依據。
 * 兩個形狀的話，每一次讀都要先問是哪一種，而那個問題會問在十幾個地方。
 */
export class StrategyBotCondition {
  constructor(
    public readonly operator: string,
    public readonly conditions: readonly StrategyBotCondition[],
    public readonly sourceLabel: string,
    public readonly signal: string,
  ) {}
}
