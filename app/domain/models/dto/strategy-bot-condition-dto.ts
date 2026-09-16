import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

/**
 * DTO：一個條件，巢狀如畫面上看到的那樣。
 *
 * 它是**巢狀**而不是一串帶著父節點編號的節點，因為那是它被想出來的形狀。
 * 攤平了的話，畫面得先把樹組回來才畫得出第一格——而那就是第二個組樹的地方，
 * 遲早會跟第一個對同一份資料有不同的看法。
 *
 * `nodeId` 只活在畫面上，後端既不收也不給。它存在的唯一理由是 Vue 的 `key`：
 * 沒有一個穩定的識別碼，刪掉中間一句時 Vue 會重用錯的那一格 DOM，
 * 使用者看到的是「另一句的內容跳到這一格」——一個看起來像資料壞掉的畫面問題。
 */
export class StrategyBotConditionDto {
  constructor(
    public readonly nodeId: string,
    /** 是群組時才有。是一句比對時為 null。 */
    public readonly operator: ConditionOperatorVo | null,
    /** 群組裡的那幾句。一句比對時為空陣列。 */
    public readonly conditions: readonly StrategyBotConditionDto[],
    /** 一句比對讀的是哪一個來源。群組時為空字串。 */
    public readonly sourceLabel: string,
    /** 那個來源要等於什麼。群組時為空字串。 */
    public readonly signal: string,
  ) {}

  /**
   * 這個節點是不是一個群組。讀的是唯一決定得了的那一個欄位，
   * 所以沒有任何呼叫端需要記得三個欄位裡哪一個是分辨的依據。
   */
  get isGroup(): boolean {
    return this.operator !== null
  }
}
