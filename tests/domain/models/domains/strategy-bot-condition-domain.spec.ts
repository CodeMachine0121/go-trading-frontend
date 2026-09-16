import { describe, expect, it } from 'vitest'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'

function comparison(nodeId: string, sourceLabel: string, signal = 'buy') {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(nodeId: string, operator: 'and' | 'or', ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(nodeId, operator, children, '', '')
}

/** 這棵樹最深的那一個群組。加東西一律往那裡加，才問得出深度上限有沒有被守住。 */
function deepestGroupNodeId(tree: StrategyBotConditionDomain): string {
  let node = tree.value!
  while (node.conditions.some(child => child.isGroup)) {
    node = node.conditions.find(child => child.isGroup)!
  }

  return node.nodeId
}

/** 「( A 且 B ) 或 C」——一棵夠深、夠寬的樹，足以讓每一種操作都有東西可以碰。 */
function aNestedTree() {
  return new StrategyBotConditionDomain(
    group('root', 'or',
      group('inner', 'and', comparison('a', 'A'), comparison('b', 'B')),
      comparison('c', 'C')),
  )
}

describe('StrategyBotConditionDomain', () => {
  it('一棵沒開始拼的樹是空的', () => {
    const tree = new StrategyBotConditionDomain(null)

    expect(tree.isEmpty).toBe(true)
    expect(tree.depth).toBe(0)
    expect(tree.nodeCount).toBe(0)
  })

  it('從無到有先放一句比對，不是先放一個群組', () => {
    // 包成群組是之後一個明確的動作——一開始就給一個空群組，等於先造出一個存不進去的狀態。
    const tree = new StrategyBotConditionDomain(null).startWithComparison('A')

    expect(tree.value?.isGroup).toBe(false)
    expect(tree.value?.sourceLabel).toBe('A')
    expect(tree.depth).toBe(1)
  })

  it('新開的群組一出生就帶兩句', () => {
    // 空群組與只有一句的群組都是存不進去的東西。讓使用者先造出一個非法狀態
    // 再要求他補滿，是把同一條規則講了兩次。
    const tree = new StrategyBotConditionDomain(null).startWithGroup('A')

    expect(tree.value?.isGroup).toBe(true)
    expect(tree.value?.conditions).toHaveLength(2)
  })

  it('讀得出一棵樹有多深、有幾個節點', () => {
    expect(aNestedTree().depth).toBe(3)
    expect(aNestedTree().nodeCount).toBe(5)
  })

  it('每一個操作都回傳一棵新的樹，原來那一棵一個字都沒動', () => {
    // 就地改深處某一個節點，正是 Vue 的響應式最容易漏掉的一種更新：
    // 按了刪除、資料變了、畫面沒動。
    const original = aNestedTree()
    const changed = original.changeOperator('root', 'and')

    expect(original.value?.operator).toBe('or')
    expect(changed.value?.operator).toBe('and')
    expect(changed.value).not.toBe(original.value)
  })

  it('在群組底下加一句比對', () => {
    const tree = aNestedTree().addComparison('inner', 'A')

    const inner = tree.value?.conditions[0]
    expect(inner?.conditions).toHaveLength(3)
    expect(inner?.conditions[2]?.sourceLabel).toBe('A')
  })

  it('在群組底下加一個群組，而它自己帶著兩句', () => {
    const tree = aNestedTree().addGroup('inner', 'A')

    const added = tree.value?.conditions[0]?.conditions[2]
    expect(added?.isGroup).toBe(true)
    expect(added?.conditions).toHaveLength(2)
  })

  it('換運算子時群組裡那幾句一個都不動', () => {
    const tree = aNestedTree().changeOperator('inner', 'or')

    const inner = tree.value?.conditions[0]
    expect(inner?.operator).toBe('or')
    expect(inner?.conditions).toHaveLength(2)
    expect(inner?.conditions[0]?.sourceLabel).toBe('A')
  })

  it('改一句比對讀的來源與它要等於什麼', () => {
    const tree = aNestedTree().changeComparison('c', 'B', 'sell')

    expect(tree.value?.conditions[1]?.sourceLabel).toBe('B')
    expect(tree.value?.conditions[1]?.signal).toBe('sell')
  })

  it('把一句比對包成群組時，原來那一句留在裡面', () => {
    // 使用者要的是「再加一個條件」，不是「把剛剛填的那一句丟掉重來」。
    const tree = aNestedTree().wrapInGroup('c', 'A')

    const wrapped = tree.value?.conditions[1]
    expect(wrapped?.isGroup).toBe(true)
    expect(wrapped?.conditions).toHaveLength(2)
    expect(wrapped?.conditions[0]?.sourceLabel).toBe('C')
  })

  it('拿掉最外層就是整棵清空', () => {
    expect(aNestedTree().removeNode('root').isEmpty).toBe(true)
  })

  it('群組有三句時拿得掉其中一句', () => {
    const three = new StrategyBotConditionDomain(
      group('root', 'and', comparison('a', 'A'), comparison('b', 'B'), comparison('c', 'C')))

    expect(three.canRemove('b')).toBe(true)
    expect(three.removeNode('b').value?.conditions).toHaveLength(2)
  })

  it('群組只剩兩句時那兩句都拿不掉', () => {
    // 再拿掉一句就成了一個只裝一句的群組，而那是存不進去的形狀。
    // 在畫面上它的樣子是刪除鍵消失，不是按了才被拒絕。
    const two = new StrategyBotConditionDomain(
      group('root', 'and', comparison('a', 'A'), comparison('b', 'B')))

    expect(two.canRemove('a')).toBe(false)
    expect(two.removeNode('a').value?.conditions).toHaveLength(2)
  })

  it('三個動作各問各的——加一個群組比加一句佔得更兇', () => {
    // 新群組一出生就帶兩句，所以它長的是兩層三個節點，不是一層一個。
    // 用同一個問題管兩種動作，就會出現「按鈕還在、按下去卻超過上限」。
    // l1 是第一層，l4 是第四層，它的兩句比對落在第五層——剛好填滿。
    const deep = new StrategyBotConditionDomain(
      group('l1', 'and',
        group('l2', 'and',
          group('l3', 'and',
            group('l4', 'and', comparison('x', 'A'), comparison('y', 'A')),
            comparison('y3', 'A')),
          comparison('y2', 'A')),
        comparison('y1', 'A')))

    expect(deep.depth).toBe(5)
    // 第四層底下還放得下一句（落在第五層），但放不下一個群組（它的兩句會落到第六層）。
    expect(deep.canAddComparisonUnder('l4')).toBe(true)
    expect(deep.canAddGroupUnder('l4')).toBe(false)
  })

  it('加一句與加一個群組都不會讓深度超過上限', () => {
    // 斷言的是**做出來的結果**，不是那個問題本身——只問問題的話，
    // 問錯了也一樣是綠的。
    let tree = new StrategyBotConditionDomain(null).startWithGroup('A')

    for (let step = 0; step < 6; step += 1) {
      const deepestGroup = deepestGroupNodeId(tree)
      if (tree.canAddGroupUnder(deepestGroup)) {
        tree = tree.addGroup(deepestGroup, 'A')
      }
      else if (tree.canAddComparisonUnder(deepestGroup)) {
        tree = tree.addComparison(deepestGroup, 'A')
      }
      expect(tree.depth).toBeLessThanOrEqual(5)
    }
  })

  it('包成群組也不會讓深度超過上限', () => {
    const deep = new StrategyBotConditionDomain(
      group('l1', 'and',
        group('l2', 'and',
          group('l3', 'and',
            group('l4', 'and', comparison('x', 'A'), comparison('y', 'A')),
            comparison('y3', 'A')),
          comparison('y2', 'A')),
        comparison('y1', 'A')))

    // x 在第五層，包起來會讓它掉到第六層。
    expect(deep.canWrapInGroup('x')).toBe(false)
  })

  it('節點數快滿時，加一個群組（三個節點）先被擋下來', () => {
    const almostFull = new StrategyBotConditionDomain(
      group('root', 'or',
        ...Array.from({ length: 30 }, (_unused, index) => comparison(`n${index}`, 'A'))))

    expect(almostFull.nodeCount).toBe(31)
    // 還放得下一個節點，但放不下三個。
    expect(almostFull.canAddComparisonUnder('root')).toBe(true)
    expect(almostFull.canAddGroupUnder('root')).toBe(false)
    expect(almostFull.addComparison('root', 'A').nodeCount).toBe(32)
  })

  it('說得出這棵樹用到哪幾個來源', () => {
    // 刪掉一個還被條件用著的來源，會讓條件指向一個不存在的代號——
    // 這一份清單就是擋下那次刪除、並說出是哪裡在用它的依據。
    expect([...aNestedTree().usedSourceLabels()].sort()).toEqual(['A', 'B', 'C'])
  })

  it('來源改名時，指到舊代號的那幾句一起改', () => {
    // 不跟著改的話，條件會指向一個不存在的代號，而畫面上那一句看起來完全正常。
    const renamed = aNestedTree().renameSourceLabel('A', '均線')

    expect(renamed.value?.conditions[0]?.conditions[0]?.sourceLabel).toBe('均線')
    expect(renamed.value?.conditions[0]?.conditions[1]?.sourceLabel).toBe('B')
  })
})
