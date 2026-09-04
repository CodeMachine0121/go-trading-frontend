import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyParameterDomain } from '~/domain/models/domains/strategy-parameter-domain'
import type { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'

/**
 * Domain Model：留存下來的那幾筆 × **現在的**策略清單 → 可以直接進清單的那幾筆。
 *
 * **還原是一次對照，不是一次還原。** 留存的內容不是「圖上長什麼樣」，
 * 而是「使用者當時要求了什麼」——那之後策略可能被刪、被改名、改了宣告、
 * 或者現在畫不成線了。**真相在策略清單那一側**，所以每一筆都要對照過才回得來。
 *
 * 把留存當成可以直接搬回畫面的快照，是這裡最容易犯而且**不會報錯**的錯：
 * 圖上會出現一筆使用者現在根本加不進來的東西，而且它永遠算不出線。
 *
 * 它與 `AppliedIndicatorParametersDomain` 的第三步看起來很像，刻意不併成一個：
 * 那一個**就是旋鈕習慣值那份記憶本身**（它持有 proxy，記下來也在它身上），
 * 這一個是一次對照，值隨著留存的那一筆一起進來。要併就得把那個完整的領域物件
 * 拆成兩半，去換一段三行的對映。
 */
export class RememberedAppliedIndicatorsDomain {
  constructor(
    private readonly rememberedAppliedIndicatorVos: readonly RememberedAppliedIndicatorVo[],
    /** **現在**還存在的那幾支策略。它是還原時唯一的真相。 */
    private readonly strategies: readonly StrategyDto[],
  ) {}

  /**
   * 交出可以直接進清單的那幾筆，依留存的順序。
   *
   * **序號由外面給**：「這一次套用」的序號由 `useChartIndicators` 一處產生，
   * 還原只是接在它後面繼續數。自己從 1 開始數會讓還原之後手動加入的那一筆撞號，
   * 而撞號的後果是移除一筆時**兩筆一起消失**。
   */
  toAppliedIndicatorDtos(lastAppliedIndicatorId: number): AppliedIndicatorDto[] {
    return this.rememberedAppliedIndicatorVos.flatMap(
      (remembered, order) => this.toAppliedIndicatorDto(
        remembered, lastAppliedIndicatorId + order + 1))
  }

  /**
   * 一筆對得上就交出一個，對不上就交出零個。
   *
   * 對不上的那兩種情況**都不出聲**：
   * - **策略被刪了**——使用者刪掉它時就知道自己刪了什麼，一則講著他上個月操作的說明只會擋在畫面上。
   * - **現在畫不成線**（改成了是非）——它在可挑清單裡本來就列得出來但挑不到，
   *   讓它自己回到圖上等於繞過那道刻意留下的擋。
   */
  private toAppliedIndicatorDto(
    rememberedAppliedIndicatorVo: RememberedAppliedIndicatorVo, appliedIndicatorId: number,
  ): AppliedIndicatorDto[] {
    return this.strategies
      .filter(strategy => strategy.id === rememberedAppliedIndicatorVo.strategyId)
      .filter(strategy => strategy.drawableOnChart)
      .map(strategy => new AppliedIndicatorDto(
        appliedIndicatorId,
        // 那一支現在的樣子——名稱改過就用現在的名字：留存的是它是哪一支，不是它叫什麼。
        strategy,
        strategy.content.parameters.map(
          declared => this.toParameter(declared, rememberedAppliedIndicatorVo.parameterValues)),
      ))
  }

  /**
   * 一格照**宣告**重建：名稱與種類一律照宣告，值取留存的那一個。
   *
   * **宣告是唯一的真相**（與挑一支新的時完全同一條規則）：留存裡有、宣告裡沒有的名字
   * 走不到這裡就消失了，因為逐條走的是宣告。「改名」不需要第三條規則——
   * 它就是「少了一個舊的、多了一個新的」。
   *
   * **留存的值要用得了才採用。** 用不了的值本來寫不進去（填得用不了的時候不寫），
   * 所以它出現在留存裡只有一種可能：那份留存被別的東西動過。這時退回策略的預設值，
   * 與「留存裡本來就沒有這個名字」是同一個落點——讓那一筆照樣回到圖上，
   * 比讓它帶著一個算不出來的值回來、然後在旁邊紅一行更有用。
   *
   * 「用得了」直接問 `StrategyParameterDomain`：「回看根數必須是大於零的整數」
   * 這條規則只有一份，不在這裡重寫。
   */
  private toParameter(
    declaredParameter: StrategyParameterDto, parameterValues: ReadonlyMap<string, number>,
  ): StrategyParameterDto {
    const rememberedValue = parameterValues.get(declaredParameter.name)
    if (rememberedValue === undefined) {
      return declaredParameter
    }

    const remembered = new StrategyParameterDto(
      declaredParameter.name, declaredParameter.kind, rememberedValue)

    return new StrategyParameterDomain(remembered).validationMessage() === null
      ? remembered
      : declaredParameter
  }
}
