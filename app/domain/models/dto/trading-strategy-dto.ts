import type { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'

/**
 * DTO：一份交易策略交給畫面的樣子。
 *
 * 兩棵條件樹已經帶著畫面用的節點識別碼回來了——補在讀回來的那一刻，
 * 而不是補在元件裡，因為元件每次重繪都會重補一次新的。
 */
export class TradingStrategyDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly signalSources: readonly TradingStrategySignalSourceDto[],
    public readonly buyCondition: TradingStrategyConditionDto | null,
    public readonly sellCondition: TradingStrategyConditionDto | null,
    /** 它吃哪一種行情。建立之後不得更換。 */
    public readonly marketDataKind: MarketDataKind = 'kCandle',
    /** 給人看的名字：「K 線」或「合約行情」。 */
    public readonly marketDataKindLabel: string = 'K 線',
    /** 合約交易策略的交易模式；K 線交易策略是 `null`。 */
    public readonly tradingMode: ContractTradingMode | null = null,
    /** 例如「只做多」；K 線交易策略是 `null`。 */
    public readonly tradingModeLabel: string | null = null,
    /** 重演它是在合約帳戶上重演。 */
    public readonly replaysOnContractAccount: boolean = false,
    /** 策略機器人跟得了它——機器人目前只跑 K 線。 */
    public readonly followableByStrategyBot: boolean = true,
  ) {}
}
