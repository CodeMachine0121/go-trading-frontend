import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

/**
 * Domain Model：一棵條件樹，以及所有改得動它的操作。
 *
 * **每一個操作都回傳一棵新的樹，沒有任何一個就地改。** 一棵樹最多 32 個節點，
 * 整棵重建的成本可以忽略；而就地改深處某一個節點，正是 Vue 的響應式最容易漏掉的一種
 * 更新——使用者按了刪除、資料變了、畫面沒動。
 *
 * 形狀規則也在這裡，但它們在畫面上的樣子是**做不到**而不是**被拒絕**：
 * 群組剩兩句時 `canRemove` 回 false（那顆鍵就消失），深到上限時 `canNestDeeper`
 * 回 false（那顆鍵也消失）。真正需要在送出前講出來的只有「兩棵樹都不得為空」。
 */
export class StrategyBotConditionDomain {
  constructor(private readonly condition: StrategyBotConditionDto | null) {}

  get value(): StrategyBotConditionDto | null {
    return this.condition
  }

  /** 空的樹是「還沒開始拼」，不是一種合法的條件——兩棵都不得為空。 */
  get isEmpty(): boolean {
    return this.condition === null
  }

  /** 這棵樹有幾層，最外層算第一層。 */
  get depth(): number {
    return this.depthOf(this.condition)
  }

  /** 這棵樹一共有幾個節點，包含自己。 */
  get nodeCount(): number {
    return this.nodeCountOf(this.condition)
  }

  /**
   * 在指定的群組底下加一句比對。
   *
   * 新的那一句預設指向第一個來源、信號預設買入——**不是留空**。
   * 留空的話畫面上會多出一句永遠不成立的條件，而它看起來跟填好的一模一樣。
   */
  addComparison(parentNodeId: string, sourceLabel: string): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        node.nodeId === parentNodeId && node.isGroup
          ? new StrategyBotConditionDto(
              node.nodeId,
              node.operator,
              [...node.conditions, this.newComparison(sourceLabel)],
              '',
              '',
            )
          : node
      )),
    )
  }

  /**
   * 在指定的群組底下加一個群組。
   *
   * 新的群組**一出生就帶兩句比對**，因為一個空群組與一個只有一句的群組都是
   * 存不進去的東西——讓使用者先造出一個非法的狀態再要求他補滿，是把規則講了兩次。
   */
  addGroup(parentNodeId: string, sourceLabel: string): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        node.nodeId === parentNodeId && node.isGroup
          ? new StrategyBotConditionDto(
              node.nodeId,
              node.operator,
              [...node.conditions, this.newGroup(sourceLabel)],
              '',
              '',
            )
          : node
      )),
    )
  }

  /** 換掉某個群組的運算子。群組裡的那幾句一個都不動。 */
  changeOperator(nodeId: string, operator: ConditionOperatorVo): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        node.nodeId === nodeId && node.isGroup
          ? new StrategyBotConditionDto(node.nodeId, operator, node.conditions, '', '')
          : node
      )),
    )
  }

  /** 改掉某一句比對讀的是哪一個來源、或它要等於什麼。 */
  changeComparison(
    nodeId: string, sourceLabel: string, signal: string,
  ): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        node.nodeId === nodeId && !node.isGroup
          ? new StrategyBotConditionDto(node.nodeId, null, [], sourceLabel, signal)
          : node
      )),
    )
  }

  /**
   * 拿掉某一個節點。拿掉最外層那一個就是整棵清空。
   *
   * 群組剩兩句時拿不掉——`canRemove` 已經讓那顆鍵不存在了，這裡再擋一次，
   * 是因為「群組至少兩句」是樹的規則，不是那顆按鈕的規則。
   */
  removeNode(nodeId: string): StrategyBotConditionDomain {
    if (this.condition === null || this.condition.nodeId === nodeId) {
      return new StrategyBotConditionDomain(null)
    }

    if (!this.canRemove(nodeId)) {
      return this
    }

    return new StrategyBotConditionDomain(this.withoutNode(this.condition, nodeId))
  }

  /**
   * 這個節點拿不拿得掉。
   *
   * 最外層永遠拿得掉（那是清空整棵）。其餘的看它爸爸剩幾句：
   * 剩到只有兩句的群組再拿掉一句就成了一個只裝一句的群組，而那是存不進去的形狀。
   */
  canRemove(nodeId: string): boolean {
    if (this.condition === null) {
      return false
    }

    if (this.condition.nodeId === nodeId) {
      return true
    }

    const parent = this.parentOf(this.condition, nodeId)

    return parent !== null
      && parent.conditions.length > STRATEGY_BOT_LIMITS.conditionGroupMinimumSize
  }

  /** 這個群組還加不加得動東西：再深一層會不會超過上限，整棵會不會超過節點數。 */
  canAddUnder(parentNodeId: string): boolean {
    const parentDepth = this.depthFromRootTo(this.condition, parentNodeId, 1)

    return parentDepth !== null
      && parentDepth < STRATEGY_BOT_LIMITS.conditionDepth
      && this.nodeCount < STRATEGY_BOT_LIMITS.conditionNodeCount
  }

  /** 從無到有開一棵樹：一句比對。把它包成群組是之後一個明確的動作。 */
  startWithComparison(sourceLabel: string): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(this.newComparison(sourceLabel))
  }

  /** 從無到有開一棵樹：一個已經裝了兩句的群組。 */
  startWithGroup(sourceLabel: string): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(this.newGroup(sourceLabel))
  }

  /**
   * 把某一句比對換成一個群組，**原來那一句留在新群組裡**。
   *
   * 留著那一句是這個操作唯一的重點：使用者要的是「再加一個條件」，
   * 而不是「把剛剛填的那一句丟掉重來」。
   */
  wrapInGroup(nodeId: string, sourceLabel: string): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        node.nodeId === nodeId && !node.isGroup
          ? new StrategyBotConditionDto(
              this.newNodeId(),
              'and',
              [node, this.newComparison(sourceLabel)],
              '',
              '',
            )
          : node
      )),
    )
  }

  /** 這棵樹用到的每一個來源代號，供「刪掉一個還被用著的來源」擋下來時說得出是誰在用。 */
  usedSourceLabels(): readonly string[] {
    return this.collectLabels(this.condition)
  }

  /** 把每一句比對裡指到的來源改名，讓第三段跟得上第二段的改動。 */
  renameSourceLabel(fromLabel: string, toLabel: string): StrategyBotConditionDomain {
    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        !node.isGroup && node.sourceLabel === fromLabel
          ? new StrategyBotConditionDto(node.nodeId, null, [], toLabel, node.signal)
          : node
      )),
    )
  }

  private newComparison(sourceLabel: string): StrategyBotConditionDto {
    return new StrategyBotConditionDto(this.newNodeId(), null, [], sourceLabel, 'buy')
  }

  private newGroup(sourceLabel: string): StrategyBotConditionDto {
    return new StrategyBotConditionDto(
      this.newNodeId(),
      'and',
      [this.newComparison(sourceLabel), this.newComparison(sourceLabel)],
      '',
      '',
    )
  }

  /**
   * 一個只活在畫面上的識別碼。
   *
   * 它的唯一用途是 Vue 的 `key`。用陣列索引當 key 的話，刪掉中間一句時
   * 後面每一句的 key 都往前挪一格，Vue 會重用錯的那一格 DOM——
   * 使用者看到的是「另一句的內容跳到這一格」，一個看起來像資料壞掉的畫面問題。
   */
  private newNodeId(): string {
    return `node-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  }

  private mapNodes(
    node: StrategyBotConditionDto | null,
    transform: (node: StrategyBotConditionDto) => StrategyBotConditionDto,
  ): StrategyBotConditionDto | null {
    if (node === null) {
      return null
    }

    const transformed = transform(node)

    if (!transformed.isGroup) {
      return transformed
    }

    return new StrategyBotConditionDto(
      transformed.nodeId,
      transformed.operator,
      transformed.conditions.map(child => this.mapNodes(child, transform)!),
      '',
      '',
    )
  }

  private withoutNode(
    node: StrategyBotConditionDto, nodeId: string,
  ): StrategyBotConditionDto {
    if (!node.isGroup) {
      return node
    }

    return new StrategyBotConditionDto(
      node.nodeId,
      node.operator,
      node.conditions
        .filter(child => child.nodeId !== nodeId)
        .map(child => this.withoutNode(child, nodeId)),
      '',
      '',
    )
  }

  private parentOf(
    node: StrategyBotConditionDto, nodeId: string,
  ): StrategyBotConditionDto | null {
    if (!node.isGroup) {
      return null
    }

    if (node.conditions.some(child => child.nodeId === nodeId)) {
      return node
    }

    for (const child of node.conditions) {
      const found = this.parentOf(child, nodeId)
      if (found !== null) {
        return found
      }
    }

    return null
  }

  private depthFromRootTo(
    node: StrategyBotConditionDto | null, nodeId: string, level: number,
  ): number | null {
    if (node === null) {
      return null
    }

    if (node.nodeId === nodeId) {
      return level
    }

    for (const child of node.conditions) {
      const found = this.depthFromRootTo(child, nodeId, level + 1)
      if (found !== null) {
        return found
      }
    }

    return null
  }

  private depthOf(node: StrategyBotConditionDto | null): number {
    if (node === null) {
      return 0
    }

    return 1 + node.conditions.reduce(
      (deepest, child) => Math.max(deepest, this.depthOf(child)), 0)
  }

  private nodeCountOf(node: StrategyBotConditionDto | null): number {
    if (node === null) {
      return 0
    }

    return node.conditions.reduce(
      (total, child) => total + this.nodeCountOf(child), 1)
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
