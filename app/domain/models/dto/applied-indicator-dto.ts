import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'

/**
 * DTO：圖上**一次套用**——清單上獨立的一筆。
 *
 * **它有兩個身分，而且刻意是兩個：**
 * - `id` 是**這一次套用**的身分。它只在這個畫面活著（留存的是「他要哪幾支、各配什麼值」，
 *   不是這幾個序號），用來分辨圖上這幾筆：移除哪一筆、哪一筆失敗了、哪一筆正在算。
 * - `strategy.id` 是**策略**的身分。線色記憶掛在它身上，因為
 *   「我習慣這支的均線是藍色」這個習慣跨越每一次打開畫面。
 *
 * 把它們混成同一把鑰匙，是這裡最容易犯而且**不會報錯**的錯：
 * 顏色會安靜地失憶，沒有任何地方會紅。
 *
 * **身分刻意不是參數值**，雖然清單上正是用值來分辨它們給人看：
 * 使用者改一筆的值，身分就會在計算飛在半空中時改變，回來的結果認不得自己；
 * 而一個旋鈕都沒有的策略可以擺兩筆，兩筆的值都是空的，會撞在一起。
 * 給人看的區分要誠實（值最誠實），給程式用的身分要穩定（序號最穩定）。
 */
export class AppliedIndicatorDto {
  constructor(
    public readonly id: number,
    public readonly strategy: StrategyDto,
    /** 這一次要用的那幾格。名稱與種類照策略的宣告，值是這一次的。 */
    public readonly parameters: readonly StrategyParameterDto[],
  ) {}

  /**
   * 沒有任何一格要調——挑了就該直接上圖，不該多一步確認。
   *
   * 多數策略沒有旋鈕。為了少數有旋鈕的策略讓所有策略都多一次確認，
   * 是拿多數人的每一次操作去補貼少數情況。
   */
  get readyToApply(): boolean {
    return this.parameters.length === 0
  }

  /**
   * 清單上用來分辨同一支的好幾筆：把這一次的值攤成一句話。
   *
   * 沒有旋鈕的策略沒有東西可標——它們靠名稱本身分辨，而兩筆一模一樣時
   * 使用者一眼看得出是同一支擺了兩次。
   */
  get parameterSummary(): string {
    return this.parameters
      .map(parameter => `${parameter.name} ${parameter.value}`)
      .join('、')
  }

  /**
   * 交出留存下來的形狀：**哪一支策略、那幾格調成什麼**。
   *
   * 轉換寫在來源身上（`a.toB()`，不是 `B.fromA(a)`）——它讀的全是自己的欄位。
   *
   * **序號不帶走**：它只在這個畫面活著，下次打開時圖上那幾筆會拿到新的序號。
   * **種類也不帶走**：種類是宣告說的，留存它只會讓一份過期的種類贏過宣告。
   * 帶走的是使用者真正要求過的那兩樣：他要哪一支，以及他把那幾格調成什麼。
   */
  toRememberedVo(): RememberedAppliedIndicatorVo {
    return new RememberedAppliedIndicatorVo(
      this.strategy.id,
      new Map(this.parameters.map(parameter => [parameter.name, parameter.value])),
    )
  }

  /** 改掉其中一格的值，交出改過之後的自己；不是這一格就原樣留著。 */
  withParameterValue(parameterName: string, value: number): AppliedIndicatorDto {
    return new AppliedIndicatorDto(
      this.id,
      this.strategy,
      this.parameters.map(parameter => (parameter.name === parameterName
        ? new StrategyParameterDto(parameter.name, parameter.kind, value)
        : parameter)),
    )
  }
}
