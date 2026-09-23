import type { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'

/**
 * DTO：工作檯交出來要存的那一份，還沒有被任何規則看過。
 *
 * 一個形狀同時服務新增與改寫，因為改寫會換掉一份交易策略記得的每一樣東西。
 * `id` 有值就是改那一份，沒有就是新的一份。
 *
 * **交易標的、觸發間隔、執行狀態都不在這裡。** 一個放不下它們的形狀，
 * 就是「這是規則，不是一台機器」這件事寫在型別上，而不是寫在讀這段程式的人腦子裡。
 */
export class TradingStrategyWriteDto {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly signalSources: readonly TradingStrategySignalSourceDto[],
    public readonly buyCondition: TradingStrategyConditionDto | null,
    public readonly sellCondition: TradingStrategyConditionDto | null,
    /** 它吃哪一種行情。改一份既有的時照抄它存著的那一種——交易服務不讓換。 */
    public readonly marketDataKind: MarketDataKind = 'kCandle',
    /** 合約交易策略的交易模式；K 線交易策略是 `null`，不上線。 */
    public readonly tradingMode: ContractTradingMode | null = null,
  ) {}
}
