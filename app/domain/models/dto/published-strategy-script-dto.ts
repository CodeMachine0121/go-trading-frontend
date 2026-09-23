import { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'

/**
 * DTO：市集上的一張卡，也是「我加入的」那一段每一列的形狀。
 *
 * **沒有算式。** 與 entity 同一個理由：那不是一個被清空的欄位，是一個不存在的欄位，
 * 所以把它當成可編輯的策略腳本來用，在型別上就寫不出來。
 */
export class PublishedStrategyScriptDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    /** 分享者寫的說明。沒寫時是空字串，畫面自行決定要不要顯示一句預設的話。 */
    public readonly description: string,
    public readonly resultType: string,
    public readonly publisherEmail: string,
    public readonly publishedAt: Date,
    public readonly parameters: readonly StrategyScriptParameterDto[],
    /**
     * 這一支在圖表上畫不畫得成線。與自己的策略腳本同一條規則、同一個理由：
     * 挑策略腳本時就標明並擋下，比套用之後才失敗誠實。
     */
    public readonly drawableOnChart: boolean,
    /**
     * 「算出來的是什麼」那句給人看的話。
     *
     * 它在這裡而不是由畫面查一張表：那張表已經有一個地方在維護了，而畫面看不到那裡。
     * 交出來的是話而不是代號，多一種種類的時候市集上就不會冒出一個沒人看得懂的字。
     */
    public readonly resultTypeLabel: string,
  ) {}

  /**
   * 它在工作區裡的樣子：分享者公開的指標值種類與旋鈕照實帶進來，**算式是空的**——
   * 不是留了一格空白，是市集上的策略腳本本來就沒有算式這一欄。
   */
  toContent(): StrategyScriptContentDto {
    return new StrategyScriptContentDto('', this.resultType, this.parameters)
  }

  /**
   * 這一支要套到圖上時的樣子。它交得出圖表需要的全部——**因為圖表不需要算式**，
   * 而這正是一支加入來的策略腳本用得動卻讀不到的地方。
   */
  toChartApplicable(): ChartApplicableStrategyScriptDto {
    return new ChartApplicableStrategyScriptDto(
      this.id,
      this.name,
      this.resultType,
      this.parameters,
      this.drawableOnChart,
      true,
    )
  }
}
