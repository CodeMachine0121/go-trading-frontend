import { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'
import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'

/** DTO：一支策略腳本離開 domain 的唯一形狀。 */
export class StrategyScriptDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    /** 擁有者寫的說明。沒寫時是空字串，畫面自行決定要不要顯示一句預設的話。 */
    public readonly description: string,
    public readonly content: StrategyScriptContentDto,
    /**
     * 這一支在圖表上畫不畫得成線。**是非畫不出來**——一個是非沒有數值可以擺在價格軸上，
     * 一串是非該畫成標記而不是線。挑策略腳本時就據此擋下，比套用後才失敗誠實：
     * 使用者不會誤以為是自己哪裡設定錯了。
     */
    public readonly drawableOnChart: boolean,
    /**
     * 這一支在不在市集上。畫面據此決定那一列顯示的是「發佈」還是「收回」，
     * 並標示它已經分享出去了。
     */
    public readonly published: boolean,
  ) {}

  /**
   * 這一支要套到圖上時的樣子。轉換寫在來源身上，而不是讓圖表那一端把整支策略腳本拆開——
   * 圖表要的是它需要的那幾樣，不是「一支策略腳本去掉幾樣」。
   */
  toChartApplicable(): ChartApplicableStrategyScriptDto {
    return new ChartApplicableStrategyScriptDto(
      this.id,
      this.name,
      this.content.resultType,
      this.content.parameters,
      this.drawableOnChart,
      false,
    )
  }
}
