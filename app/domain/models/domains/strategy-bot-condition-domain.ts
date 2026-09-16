import { ConditionNodeViewDto } from '~/domain/models/dto/condition-node-view-dto'
import type { ConditionNodeStatusVo } from '~/domain/models/dto/condition-node-view-dto'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'
import { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'
import { StrategyBotConditionNodeIdVo } from '~/domain/models/vo/strategy-bot-condition-node-id-vo'
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

  /**
   * 在這個節點底下加**一句比對**加不加得動。
   *
   * 一句比對長一層、多一個節點，所以它問的就是這兩件事。
   */
  canAddComparisonUnder(parentNodeId: string): boolean {
    return this.hasRoomUnder(parentNodeId, 1, 1)
  }

  /**
   * 在這個節點底下加**一個群組**加不加得動。
   *
   * 它問的與加一句比對**不是同一件事**：新群組一出生就帶兩句比對，所以它長的是
   * 兩層、三個節點。用同一個問題管兩種動作，就會出現「按鈕還在、按下去卻超過上限」——
   * 而那正是這一刀答應要讓它按不出來的那種錯誤。
   */
  canAddGroupUnder(parentNodeId: string): boolean {
    return this.hasRoomUnder(parentNodeId, 2, 3)
  }

  /**
   * 把這一句比對包成群組加不加得動。
   *
   * 包起來之後，原來那一句往下掉一層，旁邊還多一句——所以是多一層、多兩個節點。
   */
  canWrapInGroup(nodeId: string): boolean {
    return this.hasRoomUnder(nodeId, 1, 2)
  }

  /**
   * 在這個節點底下再長 addedDepth 層、addedNodeCount 個節點，還放得下嗎。
   *
   * 三個動作各自問各自的，是因為它們長出來的東西不一樣大。
   * 一個「通用」的問法只能假設最小的那一種，而那個假設在另外兩種上就是錯的。
   */
  private hasRoomUnder(
    parentNodeId: string, addedDepth: number, addedNodeCount: number,
  ): boolean {
    const parentDepth = this.depthFromRootTo(this.condition, parentNodeId, 1)

    return parentDepth !== null
      && parentDepth + addedDepth <= STRATEGY_BOT_LIMITS.conditionDepth
      && this.nodeCount + addedNodeCount <= STRATEGY_BOT_LIMITS.conditionNodeCount
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
              new StrategyBotConditionNodeIdVo().value,
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
    return new StrategyBotConditionDto(new StrategyBotConditionNodeIdVo().value, null, [], sourceLabel, 'buy')
  }

  private newGroup(sourceLabel: string): StrategyBotConditionDto {
    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value,
      'and',
      [this.newComparison(sourceLabel), this.newComparison(sourceLabel)],
      '',
      '',
    )
  }

  private mapNodes(
    node: StrategyBotConditionDto | null,
    transform: (node: StrategyBotConditionDto) => StrategyBotConditionDto,
  ): StrategyBotConditionDto | null {
    if (node === null) {
      return null
    }

    // 先把子節點走完，再轉換自己——順序反過來的話，「把一句比對包成群組」會爆炸：
    // 轉換產生的新群組裡裝著原來那一個節點，而它仍然符合條件，於是被再包一次，
    // 永遠包下去。先走子節點，轉換的產物就不會再被自己看到一次。
    const walked = node.isGroup
      ? new StrategyBotConditionDto(
          node.nodeId,
          node.operator,
          node.conditions.map(child => this.mapNodes(child, transform)!),
          '',
          '',
        )
      : node

    return transform(walked)
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

  /**
   * 這個洞收不收這一塊。
   *
   * 抽屜的「這塊現在按不按得下去」與落點的「這裡放不放得進去」是**同一個問題**，
   * 所以只寫在這一個地方。分開寫的話，其中一邊遲早會多一條或少一條規則，
   * 而使用者看到的是一塊按得下去卻放不進去的積木。
   *
   * 回傳一句話而不是 true/false：擋下來的時候總要說得出為什麼，
   * 而知道為什麼的是這裡。放得進去時回空字串。
   */
  refusalFor(hole: ConditionHoleVo, block: ConditionBlockVo): string {
    if (!this.hasHoleAt(hole)) {
      return '這個位置已經不在了'
    }

    const addedNodeCount = 1
    if (this.nodeCount + addedNodeCount > STRATEGY_BOT_LIMITS.conditionNodeCount) {
      return `一棵條件樹最多 ${STRATEGY_BOT_LIMITS.conditionNodeCount} 塊，已經滿了`
    }

    // 洞所在的層數，就是放進去那一塊會待的層數。根上的洞是第一層。
    const holeLevel = hole.parentNodeId === null
      ? 1
      : (this.depthFromRootTo(this.condition, hole.parentNodeId, 1) ?? 0) + 1

    // 一塊比對就是它自己一層；一個群組放下去之後裡面還要再裝東西，
    // 所以它至少要佔兩層——放得下自己卻裝不了任何東西的群組，是一個永遠存不出去的形狀。
    const neededDepth = block.kind === 'group' ? holeLevel + 1 : holeLevel
    if (neededDepth > STRATEGY_BOT_LIMITS.conditionDepth) {
      return `巢狀最多 ${STRATEGY_BOT_LIMITS.conditionDepth} 層，這裡放不下`
    }

    return ''
  }

  /** 這個洞收不收這一塊。要說出為什麼時問 `refusalFor`。 */
  accepts(hole: ConditionHoleVo, block: ConditionBlockVo): boolean {
    return this.refusalFor(hole, block) === ''
  }

  /**
   * 把一塊積木放進一個洞裡。
   *
   * 放不進去時原樣回傳自己而不是拋錯：畫面已經不讓使用者走到這裡了，
   * 而一個沒有人接的錯誤只會把整頁弄倒——弄倒的代價是他拼了半天的那棵樹。
   */
  fill(hole: ConditionHoleVo, block: ConditionBlockVo): StrategyBotConditionDomain {
    if (!this.accepts(hole, block)) {
      return this
    }

    const placed = block.kind === 'group'
      ? new StrategyBotConditionDto(
          new StrategyBotConditionNodeIdVo().value, block.operator ?? 'and', [], '', '')
      // 信號留空，不給預設值。上一版給的是「買入」，而一句填好的比對與一句
      // 還沒選信號的比對長得一模一樣——現在未完成自己會標出來，留空才誠實。
      : new StrategyBotConditionDto(
          new StrategyBotConditionNodeIdVo().value, null, [], block.sourceLabel, '')

    return this.placeAt(hole, placed)
  }

  /**
   * 把樹上已經有的一塊搬到一個洞裡，**底下的一整串跟著走**。
   *
   * 先摘下來再放回去，而且是照這個順序：反過來的話，樹上會有一瞬間存在兩份同樣身分的
   * 節點，而接著的那次摘除會把兩份都摘掉。
   *
   * 一個群組不得落進自己底下——那會把一段樹接到它自己身上，走一次就無限深。
   * 這是洞與積木唯一畫得出無效形狀的地方，所以擋在這裡，而不是靠畫面不給拖。
   */
  move(nodeId: string, hole: ConditionHoleVo): StrategyBotConditionDomain {
    const root = this.condition
    if (root === null) {
      return this
    }

    const moving = this.nodeById(root, nodeId)
    if (moving === null || !this.hasHoleAt(hole) || this.isWithin(moving, hole.parentNodeId)) {
      return this
    }

    // 搬到自己原本待的那個群組裡，是一個什麼都沒發生的動作——但摘下來之後
    // 那個群組少了一格，洞的位置就跟著往前挪，於是它會落到別人前面去。
    // 順序在且與或底下沒有意義，所以直接當作沒發生。
    const currentParent = this.parentOf(root, nodeId)
    if ((currentParent?.nodeId ?? null) === hole.parentNodeId) {
      return this
    }

    const detached = new StrategyBotConditionDomain(
      root.nodeId === nodeId ? null : this.withoutNode(root, nodeId))

    return detached.placeAt(hole, moving)
  }

  /**
   * 這棵樹連同它每一塊的狀態，畫成元件直接照著畫的形狀。
   *
   * 已宣告的代號要傳進來，因為「這一句指到一個不存在的來源」是樹自己答不出來的——
   * 樹只記得代號那一串字，誰還在是第二段的事。
   */
  toViewDto(declaredLabels: readonly string[]): ConditionNodeViewDto {
    if (this.condition === null) {
      return this.holeViewAt(new ConditionHoleVo(null, 0))
    }

    return this.nodeViewOf(this.condition, declaredLabels)
  }

  /**
   * 這棵樹存不存得下去，存不下去的話是哪一件事。存得下去時回空字串。
   *
   * 它會說出**第一件**沒好的事而不是全部：使用者一次只修一個地方，
   * 而一串同時列出來的問題，多數是同一個還沒拼完的區塊講了好幾次。
   */
  incompleteReason(declaredLabels: readonly string[]): string {
    if (this.condition === null) {
      return '還沒放任何東西進去'
    }

    return this.firstProblemIn(this.condition, declaredLabels)
  }

  /** 樹上每一個洞。抽屜與落點都問這裡，所以「哪裡算一個洞」只有一份定義。 */
  holes(): readonly ConditionHoleVo[] {
    if (this.condition === null) {
      return [new ConditionHoleVo(null, 0)]
    }

    return this.holesIn(this.condition)
  }

  private holesIn(node: StrategyBotConditionDto): ConditionHoleVo[] {
    if (!node.isGroup) {
      return []
    }

    return [
      ...node.conditions.flatMap(child => this.holesIn(child)),
      ...Array.from({ length: this.holeCountFor(node) },
        (_unused, offset) => new ConditionHoleVo(node.nodeId, node.conditions.length + offset)),
    ]
  }

  /**
   * 一個群組尾端要畫幾個洞。
   *
   * 至少一個，好讓群組永遠還能再長；還沒滿兩句時則畫到滿——一個剛放下去的空群組
   * 一次就看得出它要兩塊，而不是放一塊、再冒出一個洞、再放一塊。
   */
  private holeCountFor(node: StrategyBotConditionDto): number {
    return Math.max(
      1, STRATEGY_BOT_LIMITS.conditionGroupMinimumSize - node.conditions.length)
  }

  private hasHoleAt(hole: ConditionHoleVo): boolean {
    return this.holes().some(candidate => candidate.key === hole.key)
  }

  private placeAt(
    hole: ConditionHoleVo, placed: StrategyBotConditionDto,
  ): StrategyBotConditionDomain {
    if (hole.parentNodeId === null) {
      return new StrategyBotConditionDomain(placed)
    }

    return new StrategyBotConditionDomain(
      this.mapNodes(this.condition, node => (
        node.nodeId === hole.parentNodeId && node.isGroup
          ? new StrategyBotConditionDto(
              node.nodeId, node.operator, [...node.conditions, placed], '', '')
          : node
      )),
    )
  }

  private nodeById(
    node: StrategyBotConditionDto | null, nodeId: string,
  ): StrategyBotConditionDto | null {
    if (node === null) {
      return null
    }

    if (node.nodeId === nodeId) {
      return node
    }

    for (const child of node.conditions) {
      const found = this.nodeById(child, nodeId)
      if (found !== null) {
        return found
      }
    }

    return null
  }

  /** candidateId 是不是 node 自己或它底下的任何一個。 */
  private isWithin(node: StrategyBotConditionDto, candidateId: string | null): boolean {
    if (candidateId === null) {
      return false
    }

    return this.nodeById(node, candidateId) !== null
  }

  private nodeViewOf(
    node: StrategyBotConditionDto, declaredLabels: readonly string[],
  ): ConditionNodeViewDto {
    const status = this.statusOf(node, declaredLabels)

    return new ConditionNodeViewDto(
      node.isGroup ? 'group' : 'comparison',
      node.nodeId,
      null,
      node.operator,
      node.sourceLabel,
      node.signal,
      status,
      this.statusTextFor(node, status),
      this.canRemove(node.nodeId),
      node.isGroup
        ? [
            ...node.conditions.map(child => this.nodeViewOf(child, declaredLabels)),
            ...Array.from({ length: this.holeCountFor(node) }, (_unused, offset) =>
              this.holeViewAt(
                new ConditionHoleVo(node.nodeId, node.conditions.length + offset))),
          ]
        : [],
    )
  }

  private holeViewAt(hole: ConditionHoleVo): ConditionNodeViewDto {
    return new ConditionNodeViewDto(
      'hole', '', hole, null, '', '', 'ok', '', false, [])
  }

  private statusOf(
    node: StrategyBotConditionDto, declaredLabels: readonly string[],
  ): ConditionNodeStatusVo {
    if (node.isGroup) {
      return node.conditions.length < STRATEGY_BOT_LIMITS.conditionGroupMinimumSize
        ? 'incomplete'
        : 'ok'
    }

    if (node.sourceLabel !== '' && !declaredLabels.includes(node.sourceLabel)) {
      return 'unknownSource'
    }

    return node.sourceLabel === '' || !SIGNAL_VALUES.includes(node.signal as never)
      ? 'incomplete'
      : 'ok'
  }

  private statusTextFor(
    node: StrategyBotConditionDto, status: ConditionNodeStatusVo,
  ): string {
    if (status === 'ok') {
      return ''
    }

    if (status === 'unknownSource') {
      return `找不到信號來源「${node.sourceLabel}」了，它可能已經被刪掉或改名`
    }

    if (node.isGroup) {
      return `一個群組至少要 ${STRATEGY_BOT_LIMITS.conditionGroupMinimumSize} 塊`
    }

    return node.sourceLabel === '' ? '還沒選信號來源' : '還沒選這個來源要等於什麼'
  }

  private firstProblemIn(
    node: StrategyBotConditionDto, declaredLabels: readonly string[],
  ): string {
    const status = this.statusOf(node, declaredLabels)
    if (status !== 'ok') {
      return this.statusTextFor(node, status)
    }

    for (const child of node.conditions) {
      const problem = this.firstProblemIn(child, declaredLabels)
      if (problem !== '') {
        return problem
      }
    }

    return ''
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
