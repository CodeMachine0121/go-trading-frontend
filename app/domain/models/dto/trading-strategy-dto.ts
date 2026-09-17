import type { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'

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
    /** 這一份是寫給哪一種帳戶的。重演那一塊要它才說得出這一份是照哪一套算的。 */
    public readonly tradingMode: TradingMode,
    public readonly signalSources: readonly TradingStrategySignalSourceDto[],
    public readonly buyCondition: TradingStrategyConditionDto | null,
    public readonly sellCondition: TradingStrategyConditionDto | null,
  ) {}
}
