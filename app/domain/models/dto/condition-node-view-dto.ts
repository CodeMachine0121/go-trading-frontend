import type { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

/**
 * 一個節點現在有沒有問題，以及是哪一種問題。
 *
 * 兩種壞法分得開，因為**使用者的下一步不一樣**：`incomplete` 是「這塊還沒做完」，
 * 他要再放一塊或再選一個值；`unknownSource` 是「有東西壞了」，
 * 他要嘛把那個來源加回來、要嘛把這一句拿掉。用同一個標示說這兩件事，
 * 等於要他自己去分辨哪一種，而畫面已經知道答案了。
 */
export type ConditionNodeStatusVo = 'ok' | 'incomplete' | 'unknownSource'

/**
 * DTO：一個條件節點**畫出來的樣子**，包含它是不是一個洞。
 *
 * 元件收到這份形狀之後**一個判斷都不做**。這是刻意的：上一版的條件編輯器自己在算
 * 「加不加得動一句比對」「加不加得動一個群組」，而那幾個判斷跟 domain 裡的規則
 * 是同一件事寫了兩次——兩份規則遲早會分岔，而分岔的那天畫面會給出一顆
 * 按下去會被拒絕的按鈕。
 */
export class ConditionNodeViewDto {
  constructor(
    /** 這一格要畫成什麼。`hole` 是一個還沒放東西的位置。 */
    public readonly kind: 'hole' | 'comparison' | 'group',
    /** 節點的身分。`hole` 時為空字串——洞不是節點，沒有身分。 */
    public readonly nodeId: string,
    /** 只有 `hole` 有值：這個洞在哪裡。 */
    public readonly hole: ConditionHoleVo | null,
    /** 只有 `group` 有值。 */
    public readonly operator: ConditionOperatorVo | null,
    /** 只有 `comparison` 有值。還沒選的話是空字串。 */
    public readonly sourceLabel: string,
    /** 只有 `comparison` 有值。還沒選的話是空字串。 */
    public readonly signal: string,
    public readonly status: ConditionNodeStatusVo,
    /** `status` 不是 `ok` 時，要對使用者說的那一句。 */
    public readonly statusText: string,
    /** 這一塊拿不拿得掉。洞永遠拿不掉——它本來就是空的。 */
    public readonly removable: boolean,
    /** 群組底下的每一格，**洞已經在裡面了**，順序就是畫出來的順序。 */
    public readonly children: readonly ConditionNodeViewDto[],
  ) {}

  /** Vue 的 key。洞沒有節點身分，所以用它的位置。 */
  get key(): string {
    return this.kind === 'hole' ? `hole-${this.hole?.key ?? ''}` : this.nodeId
  }
}
