import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import type { StrategyScriptUsage } from '~/domain/models/vo/strategy-script-usage-vo'

/**
 * DTO：存一支策略腳本要給的東西。
 *
 * **識別碼有沒有，決定這次是更新還是新增**——呼叫端因此不必先判斷自己算哪一種，
 * 也不會有兩條各自演化的存檔路徑。
 */
export class StrategyScriptWriteDto {
  constructor(
    public readonly name: string,
    public readonly content: StrategyScriptContentDto,
    public readonly id?: number,
    /**
     * 這支策略腳本在做什麼，用擁有者自己的話。**可以完全不寫**，所以它有一個預設值：
     * 沒有說明與寫了一句空白，對讀的人是同一件事。
     */
    public readonly description: string = '',
    /**
     * 新增時選的用途；`null` 是「不說」——改寫與改名一律不說，因為交易服務不讓改寫順便改用途
     * （那是切換用途這個獨立的動作）。
     */
    public readonly usage: StrategyScriptUsage | null = null,
  ) {}
}
