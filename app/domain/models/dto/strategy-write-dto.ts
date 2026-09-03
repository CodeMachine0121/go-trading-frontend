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
  ) {}
}
