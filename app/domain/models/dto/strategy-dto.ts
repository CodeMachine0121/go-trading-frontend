import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'

/** DTO：一支策略離開 domain 的唯一形狀。 */
export class StrategyDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly content: StrategyContentDto,
    /**
     * 這一支的算式認不認得出外框。認不出來時 `content.scriptBody` 是整段原文，
     * 畫面據此告訴使用者這一支看起來不是在這裡寫出來的。
     */
    public readonly frameRecognised: boolean,
  ) {}
}
