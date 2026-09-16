/**
 * VO：一棵條件樹上**可以放一塊積木的位置**。
 *
 * 洞**不存在於樹裡**。存出去的樹只有填好的節點，洞是從那棵樹推出來的看法：
 * 樹是空的就有一個根上的洞，每個群組尾端固定有一個洞。把洞放進資料裡的話，
 * 送出前就得再走一次樹把它們挑掉，而那趟挑選是第二個「什麼算一個真的節點」的定義。
 *
 * 它只需要兩個欄位，因為使用者只能**往後接**，不能插在中間：且與或沒有順序，
 * 插在中間與接在尾端得到的是同一個條件。
 */
export class ConditionHoleVo {
  constructor(
    /** 這個洞在誰底下。`null` 代表整棵樹自己那一格——只有空樹才有。 */
    public readonly parentNodeId: string | null,
    /** 在那個群組的第幾格。根上的洞恆為 0。 */
    public readonly position: number,
  ) {}

  /**
   * 拿來當 Vue 的 key、也拿來比對兩個洞是不是同一個。
   *
   * 洞沒有身分證可帶——它不是一個節點，下一次重算就是一個新物件，
   * 所以「是不是同一個洞」只能由它的位置決定。
   */
  get key(): string {
    return `${this.parentNodeId ?? 'root'}:${this.position}`
  }

  /** 這個洞是不是整棵樹自己那一格。 */
  get isRoot(): boolean {
    return this.parentNodeId === null
  }
}
