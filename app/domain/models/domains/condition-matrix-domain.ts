import { ConditionMatrixDto, ConditionMatrixRowDto } from '~/domain/models/dto/condition-matrix-dto'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'
import { StrategyBotConditionNodeIdVo } from '~/domain/models/vo/strategy-bot-condition-node-id-vo'

/**
 * Domain Model：一整邊的判斷，以矩陣的形狀存在，以及所有改得動它的操作。
 *
 * **它不是第二份資料。** 存出去的永遠是條件樹；這個模型只負責在「使用者看得懂的形狀」
 * 與「後端收得下的形狀」之間翻譯。兩邊各存一份的話，第二份遲早會說出第一份沒有的話。
 *
 * 每一個操作都回傳一個新的矩陣，沒有任何一個就地改——理由與條件樹那一邊相同：
 * 就地改深處某一格，正是 Vue 的響應式最容易漏掉的一種更新。
 */
export class ConditionMatrixDomain {
  constructor(private readonly matrix: ConditionMatrixDto) {}

  get value(): ConditionMatrixDto {
    return this.matrix
  }

  /**
   * 把某一列的某一個信號打開或關掉。
   *
   * 一格是一個集合而不是一個值，所以這裡是「切換」而不是「指派」：
   * 「A 是買入或持有都算」是真的有人要說的話，而一個下拉選單說不出它。
   */
  toggleSignal(sourceLabel: string, signal: string): ConditionMatrixDomain {
    return new ConditionMatrixDomain(new ConditionMatrixDto(
      this.matrix.operator,
      this.matrix.rows.map(row => (row.sourceLabel === sourceLabel
        ? new ConditionMatrixRowDto(
            row.sourceLabel,
            row.acceptedSignals.includes(signal)
              ? row.acceptedSignals.filter(accepted => accepted !== signal)
              // 順序照著 SIGNAL_VALUES，不是照著按下去的順序——同樣的一格
              // 在兩台機器人上要長得一樣。
              : SIGNAL_VALUES.filter(
                  candidate => candidate === signal || row.acceptedSignals.includes(candidate)),
          )
        : row)),
      this.matrix.representable,
    ))
  }

  /** 換掉每一列之間怎麼合併。哪幾格打開著一格都不動。 */
  changeOperator(operator: ConditionOperatorVo): ConditionMatrixDomain {
    return new ConditionMatrixDomain(
      new ConditionMatrixDto(operator, this.matrix.rows, this.matrix.representable))
  }

  /**
   * 讓這張表的列，與這一刻宣告的來源對齊。
   *
   * 加一個來源就多一列（空的），刪一個就少一列，改代號就跟著改——
   * 而**留著的那幾列一格都不動**。表與來源是同一份東西的兩種看法，
   * 所以它們不會有「還沒同步」的狀態。
   */
  alignedTo(sourceLabels: readonly string[]): ConditionMatrixDomain {
    return new ConditionMatrixDomain(new ConditionMatrixDto(
      this.matrix.operator,
      sourceLabels.map(label => this.matrix.rows.find(row => row.sourceLabel === label)
        ?? new ConditionMatrixRowDto(label, [])),
      this.matrix.representable,
    ))
  }

  /**
   * 這張表寫成後端收得下的那棵樹。沒有任何一列參與判斷時回 `null`。
   *
   * 一列打開好幾個信號時，那一列自己是一個「或」——「A 是買入或持有」。
   * 整體是「或」的話就不用再包一層，直接攤進去：一個只有一種可能的巢狀，
   * 存進去之後讀回來會變成另一個形狀，而那會讓「存進去的與讀出來的一樣」不再成立。
   */
  toCondition(): StrategyBotConditionDto | null {
    const clauses = this.matrix.rows
      .filter(row => row.participates)
      .map(row => this.clauseFor(row))

    if (clauses.length === 0) {
      return null
    }

    if (clauses.length === 1) {
      return clauses[0]!
    }

    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, this.matrix.operator, clauses, '', '')
  }

  private clauseFor(row: ConditionMatrixRowDto): StrategyBotConditionDto {
    const comparisons = row.acceptedSignals.map(signal => new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, null, [], row.sourceLabel, signal))

    if (comparisons.length === 1) {
      return comparisons[0]!
    }

    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, 'or', comparisons, '', '')
  }
}
