import { TradingStrategyDomain } from '~/domain/models/domains/trading-strategy-domain'

/**
 * Entity：後端那一份交易策略的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * 它記的是**規則**：幾個信號來源，加上把它們合成一個結論的兩棵條件樹。
 * 交易標的、觸發間隔、執行狀態一律不在這裡——那三樣是機器的事，
 * 分開之後同一份規則才能被好幾台機器人同時用。
 */
export class TradingStrategy {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly signalSources: readonly TradingStrategySignalSource[],
    /** 兩棵條件樹。後端保證兩邊都不為空，但讀回來的是資料，所以這裡仍然允許沒有。 */
    public readonly buyCondition: TradingStrategyCondition | null,
    public readonly sellCondition: TradingStrategyCondition | null,
  ) {}

  toDomain(): TradingStrategyDomain {
    return new TradingStrategyDomain(this)
  }
}

/**
 * Entity：一個信號來源。**沒有 script 欄位**——不是留空，是這個形狀裡沒有那一格。
 */
export class TradingStrategySignalSource {
  constructor(
    public readonly label: string,
    public readonly strategyScriptId: number,
    public readonly aggregationInterval: string,
    public readonly parameterValues: readonly TradingStrategyParameterValue[],
  ) {}
}

/** Entity：一個旋鈕在這個來源裡調到多少。 */
export class TradingStrategyParameterValue {
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
export class TradingStrategyCondition {
  constructor(
    public readonly operator: string,
    public readonly conditions: readonly TradingStrategyCondition[],
    public readonly sourceLabel: string,
    public readonly signal: string,
  ) {}
}
