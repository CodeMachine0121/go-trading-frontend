import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'

/**
 * DTO：存一支策略要給的東西。
 *
 * **識別碼有沒有，決定這次是更新還是新增**——呼叫端因此不必先判斷自己算哪一種，
 * 也不會有兩條各自演化的存檔路徑。
 */
export class StrategyWriteDto {
  constructor(
    public readonly name: string,
    public readonly content: StrategyContentDto,
    public readonly id?: number,
    /**
     * 這支策略在做什麼，用擁有者自己的話。**可以完全不寫**，所以它有一個預設值：
     * 沒有說明與寫了一句空白，對讀的人是同一件事。
     */
    public readonly description: string = '',
  ) {}
}
