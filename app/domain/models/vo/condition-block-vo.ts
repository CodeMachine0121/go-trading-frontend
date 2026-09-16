import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

/**
 * 一塊積木有哪幾種。
 *
 * 兩種，因為一個條件就是兩種東西之一（見 StrategyBotConditionDto）。
 * 第三種積木要進來時，它進的是這裡、`StrategyBotConditionDomain.accepts` 與
 * 畫節點的那一段——抽屜、拖拉、落點一行都不用改。
 */
export type ConditionBlockKindVo = 'comparison' | 'group'

/**
 * VO：抽屜裡的**一塊積木**，也就是「要放進洞裡的是什麼」。
 *
 * 點按與拖拉是取得一塊積木的兩種手段，之後走的是同一個放置方法——
 * 所以兩條路描述積木的方式必須是同一個型別，否則它們會在放置那一刻分岔。
 *
 * 它**不負責把自己變成一串可以拖過瀏覽器的字**。瀏覽器的拖放只搬得動字串，
 * 而搬過去之後要有人把字串變回一塊積木——那個方向沒有來源物件可以掛，
 * 只能是一個 static。所以拖著的是什麼由工作台自己記著，
 * 拖放通道裡那串字只是為了讓瀏覽器認得這是一次拖曳。
 */
export class ConditionBlockVo {
  constructor(
    public readonly kind: ConditionBlockKindVo,
    /** 比對用：這一塊讀哪一個來源。群組時為空字串。 */
    public readonly sourceLabel: string,
    /** 群組用：這一塊怎麼合併裡面那幾句。比對時為 null。 */
    public readonly operator: ConditionOperatorVo | null,
  ) {}

  /** 拿來當 Vue 的 key，也拿來比對抽屜裡哪一塊正被拖著。 */
  get key(): string {
    return `${this.kind}:${this.sourceLabel}:${this.operator ?? ''}`
  }
}
