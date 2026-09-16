import { describe, expect, it } from 'vitest'
import { ConditionBlockPaletteDomain } from '~/domain/models/domains/condition-block-palette-domain'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

function comparison(nodeId: string, sourceLabel: string) {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, 'buy')
}

function group(nodeId: string, ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(nodeId, 'and', children, '', '')
}

function drawerFor(
  condition: StrategyBotConditionDomain,
  labels: readonly string[],
  hole: ConditionHoleVo | null,
) {
  return new ConditionBlockPaletteDomain(condition, labels, hole).toDto()
}

const emptyTree = () => new StrategyBotConditionDomain(null)
const rootHole = () => new ConditionHoleVo(null, 0)

describe('積木抽屜', () => {
  it('每一個已宣告的來源各一塊，順序照著宣告的順序', () => {
    const drawer = drawerFor(emptyTree(), ['A', 'B', 'C'], rootHole())

    expect(drawer.comparisons.map(option => option.label))
      .toEqual(['A 等於…', 'B 等於…', 'C 等於…'])
  })

  it('群組永遠是全部成立與任一成立兩塊', () => {
    const drawer = drawerFor(emptyTree(), ['A'], rootHole())

    expect(drawer.groups).toHaveLength(2)
    expect(drawer.groups.map(option => option.block.operator)).toEqual(['and', 'or'])
  })

  it('一個來源都沒宣告時比對那一類是空的，而且抽屜自己說得出為什麼', () => {
    // 一個空著的分類看起來像壞了，不像「你還沒給我材料」。
    const drawer = drawerFor(emptyTree(), [], rootHole())

    expect(drawer.comparisons).toHaveLength(0)
    expect(drawer.hint).toContain('信號來源')
  })

  it('還沒點任何空位時每一塊都列得出來，但都按不下去', () => {
    // 抽屜要先在那裡，使用者才拖得起來——所以它不會因為沒點東西就消失。
    const drawer = drawerFor(emptyTree(), ['A'], null)

    expect(drawer.comparisons).toHaveLength(1)
    expect(drawer.comparisons[0]!.enabled).toBe(false)
    expect(drawer.groups.every(option => !option.enabled)).toBe(true)
  })

  it('點了一個放得進去的空位，該放得進去的就按得下去', () => {
    const drawer = drawerFor(emptyTree(), ['A'], rootHole())

    expect(drawer.comparisons[0]!.enabled).toBe(true)
    expect(drawer.groups.every(option => option.enabled)).toBe(true)
  })

  it('放不進去的那幾塊仍然列出來，並說得出原因', () => {
    // 整個拿掉的話，使用者看到的是一個東西變少了的抽屜，
    // 而不知道是自己碰到了上限。
    const packed = new StrategyBotConditionDomain(group('g',
      ...Array.from({ length: STRATEGY_BOT_LIMITS.conditionNodeCount - 1 },
        (_unused, index) => comparison(`c${index}`, 'A'))))

    const drawer = drawerFor(
      packed, ['A'], new ConditionHoleVo('g', STRATEGY_BOT_LIMITS.conditionNodeCount - 1))

    expect(drawer.comparisons).toHaveLength(1)
    expect(drawer.comparisons[0]!.enabled).toBe(false)
    expect(drawer.comparisons[0]!.disabledReason).not.toBe('')
  })

  it('抽屜說的話與那棵樹說的話是同一句——擋人的規則只寫在一個地方', () => {
    const packed = new StrategyBotConditionDomain(group('g',
      ...Array.from({ length: STRATEGY_BOT_LIMITS.conditionNodeCount - 1 },
        (_unused, index) => comparison(`c${index}`, 'A'))))
    const hole = new ConditionHoleVo('g', STRATEGY_BOT_LIMITS.conditionNodeCount - 1)

    const drawer = drawerFor(packed, ['A'], hole)

    expect(drawer.comparisons[0]!.disabledReason)
      .toBe(packed.refusalFor(hole, drawer.comparisons[0]!.block))
  })

  it('來源改了，抽屜立刻跟著改——它列的是這一刻拼得出來的東西', () => {
    const tree = emptyTree()

    expect(drawerFor(tree, ['A'], rootHole()).comparisons.map(option => option.label))
      .toEqual(['A 等於…'])
    expect(drawerFor(tree, ['C'], rootHole()).comparisons.map(option => option.label))
      .toEqual(['C 等於…'])
  })
})
