import { describe, expect, it } from 'vitest'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import type { ConditionNodeViewDto } from '~/domain/models/dto/condition-node-view-dto'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'
import { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

function comparison(nodeId: string, sourceLabel: string, signal = 'buy') {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(nodeId: string, operator: 'and' | 'or', ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(nodeId, operator, children, '', '')
}

function comparisonBlock(sourceLabel: string) {
  return new ConditionBlockVo('comparison', sourceLabel, null)
}

function groupBlock(operator: 'and' | 'or' = 'and') {
  return new ConditionBlockVo('group', '', operator)
}

const emptyTree = () => new StrategyBotConditionDomain(null)

/** 「( A 且 B ) 或 C」——夠深也夠寬，每一種操作都有東西可以碰。 */
function aNestedTree() {
  return new StrategyBotConditionDomain(
    group('root', 'or',
      group('inner', 'and', comparison('a', 'A'), comparison('b', 'B')),
      comparison('c', 'C')),
  )
}

/** 一棵樹畫出來的每一格，攤平成好比對的樣子。 */
function flatten(view: ConditionNodeViewDto): string[] {
  return [view.kind, ...view.children.flatMap(child => flatten(child))]
}

describe('一棵樹上的洞', () => {
  it('空的樹只有一個洞，就在根上', () => {
    const holes = emptyTree().holes()

    expect(holes).toHaveLength(1)
    expect(holes[0]!.isRoot).toBe(true)
  })

  it('一句比對底下沒有洞——洞只長在群組裡', () => {
    const tree = new StrategyBotConditionDomain(comparison('only', 'A'))

    expect(tree.holes()).toHaveLength(0)
  })

  it('剛放下去的空群組一次就看得出它要兩塊', () => {
    // 放一塊、再冒出一個洞、再放一塊，會讓人以為第二塊是可加可不加的。
    const tree = new StrategyBotConditionDomain(group('g', 'and'))

    expect(tree.holes()).toHaveLength(2)
  })

  it('滿了兩塊的群組留一個洞，好讓它還能再長', () => {
    const tree = new StrategyBotConditionDomain(
      group('g', 'and', comparison('a', 'A'), comparison('b', 'B')))

    expect(tree.holes().map(hole => hole.key)).toEqual(['g:2'])
  })

  it('巢狀的每一個群組各自有自己的洞', () => {
    expect(aNestedTree().holes().map(hole => hole.key)).toEqual(['inner:2', 'root:2'])
  })
})

describe('把一塊積木放進洞裡', () => {
  it('放進空樹的根，那一塊就是整棵樹', () => {
    const filled = emptyTree().fill(new ConditionHoleVo(null, 0), comparisonBlock('A'))

    expect(filled.value?.sourceLabel).toBe('A')
    expect(filled.value?.isGroup).toBe(false)
  })

  it('新放的比對不給信號預設值——填好的與沒填的不該長得一樣', () => {
    const filled = emptyTree().fill(new ConditionHoleVo(null, 0), comparisonBlock('A'))

    expect(filled.value?.signal).toBe('')
  })

  it('新放的群組是空的，裡面兩個洞', () => {
    const filled = emptyTree().fill(new ConditionHoleVo(null, 0), groupBlock('or'))

    expect(filled.value?.operator).toBe('or')
    expect(filled.value?.conditions).toHaveLength(0)
    expect(filled.holes()).toHaveLength(2)
  })

  it('放進群組尾端就接在最後面，原本那幾塊一個都沒動', () => {
    const filled = aNestedTree().fill(new ConditionHoleVo('inner', 2), comparisonBlock('C'))
    const inner = filled.value!.conditions[0]!

    expect(inner.conditions.map(child => child.sourceLabel)).toEqual(['A', 'B', 'C'])
  })

  it('放進一個不存在的洞什麼都不會發生', () => {
    const tree = aNestedTree()

    expect(tree.fill(new ConditionHoleVo('nobody', 0), comparisonBlock('A')).value)
      .toEqual(tree.value)
  })
})

describe('這個洞收不收這一塊', () => {
  it('節點數到上限就什麼都放不進去，並說得出是滿了', () => {
    const packed = new StrategyBotConditionDomain(group('g', 'and',
      ...Array.from({ length: STRATEGY_BOT_LIMITS.conditionNodeCount - 1 },
        (_unused, index) => comparison(`c${index}`, 'A'))))

    const refusal = packed.refusalFor(
      new ConditionHoleVo('g', STRATEGY_BOT_LIMITS.conditionNodeCount - 1),
      comparisonBlock('A'))

    expect(refusal).toContain(String(STRATEGY_BOT_LIMITS.conditionNodeCount))
  })

  it('最深的那一層還放得下比對，但放不下群組', () => {
    // 一個群組放下去之後裡面還要再裝東西，所以它比一句比對多佔一層。
    // 兩種用同一個問題管的話，就會出現一顆按下去才超過上限的按鈕。
    let deepest = new StrategyBotConditionDomain(group('g1', 'and'))
    let parentId = 'g1'
    for (let level = 2; level < STRATEGY_BOT_LIMITS.conditionDepth; level += 1) {
      deepest = deepest.fill(new ConditionHoleVo(parentId, 0), groupBlock())
      parentId = deepest.holes()[0]!.parentNodeId!
    }

    const lastHole = deepest.holes()[0]!

    expect(deepest.accepts(lastHole, comparisonBlock('A'))).toBe(true)
    expect(deepest.refusalFor(lastHole, groupBlock()))
      .toContain(String(STRATEGY_BOT_LIMITS.conditionDepth))
  })
})

describe('把樹上已經有的一塊搬走', () => {
  it('搬一個群組就是搬走它底下的一整串', () => {
    const moved = aNestedTree().move('inner', new ConditionHoleVo('root', 2))
    const carried = moved.value!.conditions.find(child => child.nodeId === 'inner')!

    expect(carried.conditions.map(child => child.sourceLabel)).toEqual(['A', 'B'])
  })

  it('搬走之後原本的位置就空了', () => {
    const moved = aNestedTree().move('a', new ConditionHoleVo('root', 2))
    const inner = moved.value!.conditions.find(child => child.nodeId === 'inner')!

    expect(inner.conditions.map(child => child.nodeId)).toEqual(['b'])
  })

  it('一個群組落不進自己底下——那會把一段樹接到它自己身上', () => {
    const tree = aNestedTree()

    expect(tree.move('root', new ConditionHoleVo('inner', 2)).value).toEqual(tree.value)
  })

  it('一個群組也落不進它自己尾端那個洞', () => {
    const tree = aNestedTree()

    expect(tree.move('inner', new ConditionHoleVo('inner', 2)).value).toEqual(tree.value)
  })

  it('搬回自己原本待的那個群組是什麼都沒發生', () => {
    const tree = aNestedTree()

    expect(tree.move('a', new ConditionHoleVo('inner', 2)).value).toEqual(tree.value)
  })
})

describe('這棵樹畫出來的樣子', () => {
  it('空的樹就畫成一個洞', () => {
    expect(emptyTree().toViewDto([]).kind).toBe('hole')
  })

  it('群組底下的洞已經排在它該在的位置上', () => {
    const view = new StrategyBotConditionDomain(
      group('g', 'and', comparison('a', 'A'))).toViewDto(['A'])

    expect(flatten(view)).toEqual(['group', 'comparison', 'hole'])
  })

  it('還不夠兩塊的群組自己標出還沒填完', () => {
    const view = new StrategyBotConditionDomain(
      group('g', 'and', comparison('a', 'A'))).toViewDto(['A'])

    expect(view.status).toBe('incomplete')
    expect(view.statusText).toContain('2')
  })

  it('還沒選信號的比對自己標出還沒填完', () => {
    const view = new StrategyBotConditionDomain(comparison('a', 'A', '')).toViewDto(['A'])

    expect(view.status).toBe('incomplete')
  })

  it('指向一個沒宣告的來源是另一種標示，不是還沒填完', () => {
    // 兩種壞法使用者的下一步不一樣：一個是再填一點，一個是有東西被刪掉了。
    const view = new StrategyBotConditionDomain(comparison('a', 'A')).toViewDto(['B'])

    expect(view.status).toBe('unknownSource')
    expect(view.statusText).toContain('A')
  })

  it('每一塊都好了就沒有任何標示', () => {
    const view = aNestedTree().toViewDto(['A', 'B', 'C'])

    expect(flatten(view)).not.toContain('incomplete')
    expect(view.status).toBe('ok')
  })
})

describe('這棵樹存不存得下去', () => {
  it('空的樹說它還沒放東西', () => {
    expect(emptyTree().incompleteReason([])).toContain('還沒放')
  })

  it('每一塊都好了就沒話說', () => {
    expect(aNestedTree().incompleteReason(['A', 'B', 'C'])).toBe('')
  })

  it('深處有一塊沒填完也講得出來', () => {
    const tree = new StrategyBotConditionDomain(
      group('root', 'or', group('inner', 'and', comparison('a', 'A')), comparison('c', 'C')))

    expect(tree.incompleteReason(['A', 'C'])).toContain('至少')
  })
})
