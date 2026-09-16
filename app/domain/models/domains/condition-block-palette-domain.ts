import { ConditionBlockDrawerDto } from '~/domain/models/dto/condition-block-drawer-dto'
import { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'
import type { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'
import type { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'

/**
 * Domain Model：這一刻的積木抽屜。
 *
 * 它自己**不判斷任何一條形狀規則**——放不放得進去一律問那棵樹。這是刻意的：
 * 抽屜的「這塊按不按得下去」與落點的「這裡收不收」是同一個問題，
 * 兩邊各自算一次的話，遲早會出現一塊按得下去卻放不進去的積木。
 *
 * 它每次都由**這一刻已宣告的代號**重新算出來，不留任何快取：
 * 抽屜列的就是現在拼得出來的東西，而使用者隨時會在第二段加一個、刪一個、改一個代號。
 */
export class ConditionBlockPaletteDomain {
  constructor(
    private readonly condition: StrategyBotConditionDomain,
    private readonly declaredLabels: readonly string[],
    /**
     * 使用者剛剛點的那個洞。沒點任何洞時為 `null`，這時每一塊都列得出來但都按不下去——
     * 抽屜要先在那裡，使用者才拖得起來，所以它不會因為沒點東西就消失。
     */
    private readonly selectedHole: ConditionHoleVo | null,
  ) {}

  toDto(): ConditionBlockDrawerDto {
    return new ConditionBlockDrawerDto(
      this.declaredLabels.map(label => this.optionFor(
        new ConditionBlockVo('comparison', label, null), `${label} 等於…`)),
      CONDITION_OPERATORS.map(operator => this.optionFor(
        new ConditionBlockVo('group', '', operator), CONDITION_OPERATOR_LABELS[operator])),
      this.hint(),
    )
  }

  private optionFor(block: ConditionBlockVo, label: string): ConditionBlockOptionDto {
    if (this.selectedHole === null) {
      return new ConditionBlockOptionDto(block, label, false, '先點一個空位，或把這一塊拖過去')
    }

    const refusal = this.condition.refusalFor(this.selectedHole, block)

    return new ConditionBlockOptionDto(block, label, refusal === '', refusal)
  }

  /**
   * 抽屜自己要說的那一句。
   *
   * 一個來源都沒宣告時**一定要說話**：那時比對那一類是空的，而一個空著的分類
   * 看起來像壞了，不像「你還沒給我材料」。
   */
  private hint(): string {
    if (this.declaredLabels.length === 0) {
      return '還沒有任何信號來源。先在左邊加一個，這裡才有東西可以拼。'
    }

    if (this.selectedHole === null) {
      return '點一個空位，或直接把積木拖過去。'
    }

    return '點一塊放進剛剛選的空位。'
  }
}
