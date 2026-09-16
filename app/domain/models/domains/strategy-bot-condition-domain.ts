import { ConditionMatrixDto, ConditionMatrixRowDto } from '~/domain/models/dto/condition-matrix-dto'
import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'

/**
 * Domain Model：一棵存起來的條件樹。
 *
 * 它現在**只做一件事：把樹讀成一張表**。編輯不在這裡發生——使用者改的是表
 * （見 ConditionMatrixDomain），送出去時再由表寫回一棵樹。
 *
 * 之前這裡有一整套「在某個節點底下加一句、把一句包成群組、某個洞收不收某一塊」的
 * 操作，那是為了一個由積木與空位組成的畫面。那個畫面被一張表取代了，
 * 而那些操作跟著整批消失——**沒有人在用的能力留著，下一個人會以為它還有意義**。
 */
export class StrategyBotConditionDomain {
  constructor(private readonly condition: StrategyBotConditionDto | null) {}

  get value(): StrategyBotConditionDto | null {
    return this.condition
  }

  /** 空的樹是「還沒設定」，不是一種合法的條件——兩邊都不得為空。 */
  get isEmpty(): boolean {
    return this.condition === null
  }

  /**
   * 這棵樹畫成一張表：每一列一個來源，格子裡是它要是哪幾個信號才算數。
   *
   * 畫得出來的形狀只有一種：**每個來源各出一句（或幾句同來源的句子），整體用同一個
   * 運算子串起來**。那涵蓋了實際會寫的絕大多數條件，換來的是一張沒有空位、
   * 沒有拖拉、沒有巢狀的表。
   *
   * 畫不出來時（且與或交錯）**不硬壓平**：壓平會得到一個意思不同的條件，
   * 而使用者會在完全沒察覺的情況下把它存回去。`representable` 為 false，
   * 畫面照實說。
   *
   * 已宣告的代號要傳進來，因為表的列是由**來源**決定的，不是由樹決定的：
   * 一個宣告了但還沒用到的來源，也該有一列空的等著他勾。
   */
  toMatrixDto(sourceLabels: readonly string[]): ConditionMatrixDto {
    const emptyRows = sourceLabels.map(label => new ConditionMatrixRowDto(label, []))

    if (this.condition === null) {
      return new ConditionMatrixDto('and', emptyRows, true)
    }

    // 一句比對自己就是一整邊：一列、一個信號，整體用哪個運算子都一樣。
    if (!this.condition.isGroup) {
      return new ConditionMatrixDto('and', this.rowsFrom([this.condition], sourceLabels), true)
    }

    const clauses = this.flattenedClauses(this.condition, this.condition.operator!)

    return clauses === null
      ? new ConditionMatrixDto(this.condition.operator!, emptyRows, false)
      : new ConditionMatrixDto(
          this.condition.operator!, this.rowsFrom(clauses, sourceLabels), true)
  }

  /** 這棵樹用到的每一個來源代號。 */
  usedSourceLabels(): readonly string[] {
    return this.collectLabels(this.condition)
  }

  /**
   * 這個群組底下所有的比對，攤成一排——攤不平時回 `null`。
   *
   * 攤得平的只有兩種：同一個運算子一路到底（`A且(B且C)` 與 `A且B且C` 是同一件事），
   * 或是「或」的子群組**只提到一個來源**（那正是「A 是買入或持有」在樹上的樣子）。
   *
   * 其餘的（`A且(B或C)`，兩個不同來源）攤平之後意思會變，所以不攤——
   * 一個悄悄改變意思的轉換，比一個說自己做不到的轉換危險得多。
   */
  private flattenedClauses(
    group: StrategyBotConditionDto, operator: ConditionOperatorVo,
  ): StrategyBotConditionDto[] | null {
    const flattened: StrategyBotConditionDto[] = []

    for (const child of group.conditions) {
      if (!child.isGroup) {
        flattened.push(child)

        continue
      }

      if (child.operator === operator) {
        const deeper = this.flattenedClauses(child, operator)
        if (deeper === null) {
          return null
        }
        flattened.push(...deeper)

        continue
      }

      // 運算子不同的子群組：只有「它整群都在講同一個來源」時才畫得出來，
      // 因為那就是一格裡打開好幾個信號的意思。
      const labels = new Set(this.collectLabels(child))
      if (labels.size !== 1 || child.conditions.some(grandchild => grandchild.isGroup)) {
        return null
      }
      flattened.push(...child.conditions)
    }

    return flattened
  }

  /** 攤平之後的那一排比對，依來源歸成一列一列。 */
  private rowsFrom(
    clauses: readonly StrategyBotConditionDto[], sourceLabels: readonly string[],
  ): ConditionMatrixRowDto[] {
    const signalsByLabel = new Map<string, string[]>()
    for (const clause of clauses) {
      const accepted = signalsByLabel.get(clause.sourceLabel) ?? []
      if (!accepted.includes(clause.signal)) {
        accepted.push(clause.signal)
      }
      signalsByLabel.set(clause.sourceLabel, accepted)
    }

    // 列的順序照著**來源**，不是照著樹——使用者在旁邊看到的策略清單就是這個順序。
    // 樹上提到、但已經不在來源裡的代號仍然列出來，排在後面：
    // 一列看不見的條件會在儲存時被擋下來，而他不知道它在哪裡。
    const orphanLabels = [...signalsByLabel.keys()].filter(label => !sourceLabels.includes(label))

    return [...sourceLabels, ...orphanLabels].map(label => new ConditionMatrixRowDto(
      label,
      SIGNAL_VALUES.filter(signal => (signalsByLabel.get(label) ?? []).includes(signal)),
    ))
  }

  private collectLabels(node: StrategyBotConditionDto | null): string[] {
    if (node === null) {
      return []
    }

    if (!node.isGroup) {
      return [node.sourceLabel]
    }

    return node.conditions.flatMap(child => this.collectLabels(child))
  }
}
