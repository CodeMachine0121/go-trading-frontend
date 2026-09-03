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
    /**
     * 這一支在圖表上畫不畫得成線。**是非畫不出來**——一個是非沒有數值可以擺在價格軸上，
     * 一串是非該畫成標記而不是線。挑策略時就據此擋下，比套用後才失敗誠實：
     * 使用者不會誤以為是自己哪裡設定錯了。
     */
    public readonly drawableOnChart: boolean,
  ) {}
}
