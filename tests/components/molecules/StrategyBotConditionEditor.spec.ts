import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotConditionEditor from '~/components/molecules/StrategyBotConditionEditor.vue'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'

const SIGNAL_OPTIONS = [
  { value: 'buy', label: '買入' },
  { value: 'sell', label: '賣出' },
  { value: 'hold', label: '持有' },
]

function comparison(nodeId: string, sourceLabel: string, signal = 'buy') {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(nodeId: string, operator: 'and' | 'or', ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(nodeId, operator, children, '', '')
}

function mountEditor(
  condition: StrategyBotConditionDto,
  options: {
    removableNodeIds?: string[]
    canAddComparison?: boolean
    canAddGroup?: boolean
    canWrapInGroup?: boolean
  } = {},
) {
  return mount(StrategyBotConditionEditor, {
    props: {
      condition,
      sourceLabels: ['A', 'B', 'C'],
      signalOptions: SIGNAL_OPTIONS,
      canAddComparison: () => options.canAddComparison ?? true,
      canAddGroup: () => options.canAddGroup ?? true,
      canWrapInGroup: () => options.canWrapInGroup ?? true,
      removableNodeIds: options.removableNodeIds ?? [],
    },
  })
}

/** 「( A 且 B ) 或 C」——兩層巢狀，足以證明它真的會自己畫自己。 */
function aNestedCondition() {
  return group('root', 'or',
    group('inner', 'and', comparison('a', 'A'), comparison('b', 'B')),
    comparison('c', 'C'))
}

describe('StrategyBotConditionEditor 畫一句比對', () => {
  it('兩個欄位都是選的，不是打字的', () => {
    // 指到一個沒宣告的代號這種錯誤因此**打不出來**。
    const wrapper = mountEditor(comparison('a', 'A'))

    const sourceSelect = wrapper.get('[data-testid="condition-source-select"]')
    expect(sourceSelect.findAll('option').map(option => option.text())).toEqual(['A', 'B', 'C'])

    const signalSelect = wrapper.get('[data-testid="condition-signal-select"]')
    expect(signalSelect.findAll('option').map(option => option.text()))
      .toEqual(['買入', '賣出', '持有'])
  })

  it('「等於」是文字不是選單', () => {
    // 沒有第二種比對方式，做成選單只會讓人以為有。
    const wrapper = mountEditor(comparison('a', 'A'))

    expect(wrapper.text()).toContain('等於')
    expect(wrapper.findAll('select')).toHaveLength(2)
  })

  it('改了任何一格都把整句一起交出去', () => {
    const wrapper = mountEditor(comparison('a', 'A', 'buy'))

    wrapper.get('[data-testid="condition-signal-select"]').setValue('sell')

    expect(wrapper.emitted('changeComparison')?.[0]).toEqual(['a', 'A', 'sell'])
  })
})

describe('StrategyBotConditionEditor 畫巢狀', () => {
  it('它自己畫自己的子條件', () => {
    // 巢狀在畫面上是縮排、在程式裡就是遞迴。
    const wrapper = mountEditor(aNestedCondition())

    expect(wrapper.findAll('[data-testid="condition-group"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="condition-comparison"]')).toHaveLength(3)
  })

  it('每一個群組有自己的運算子選單', () => {
    const wrapper = mountEditor(aNestedCondition())

    const operatorSelects = wrapper.findAll('[data-testid="condition-operator-select"]')
    expect(operatorSelects).toHaveLength(2)
    expect((operatorSelects[0]?.element as HTMLSelectElement).value).toBe('or')
    expect((operatorSelects[1]?.element as HTMLSelectElement).value).toBe('and')
  })

  it('深處的事件一路冒到最上面，帶著出事的是哪一個節點', () => {
    const wrapper = mountEditor(aNestedCondition())

    wrapper.findAll('[data-testid="condition-operator-select"]')[1]?.setValue('or')

    expect(wrapper.emitted('changeOperator')?.[0]).toEqual(['inner', 'or'])
  })

  it('深處的加一句也帶著它要加在哪一個群組底下', () => {
    const wrapper = mountEditor(aNestedCondition())

    wrapper.findAll('[data-testid="condition-add-comparison"]')[1]?.trigger('click')

    expect(wrapper.emitted('addComparison')?.[0]).toEqual(['inner'])
  })
})

describe('StrategyBotConditionEditor 讓做不到的事沒有按鈕', () => {
  it('拿不掉的節點沒有移除鍵', () => {
    // 群組剩兩句時那兩句都拿不掉——規則的樣子是**做不到**，不是按了才被拒絕。
    const wrapper = mountEditor(aNestedCondition(), { removableNodeIds: ['c'] })

    expect(wrapper.findAll('[data-testid="condition-remove"]')).toHaveLength(1)
  })

  it('加不動的時候沒有新增鍵', () => {
    const wrapper = mountEditor(aNestedCondition(), {
      canAddComparison: false, canAddGroup: false, canWrapInGroup: false,
    })

    expect(wrapper.findAll('[data-testid="condition-add-comparison"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="condition-add-group"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="condition-wrap-in-group"]')).toHaveLength(0)
  })

  it('三個動作各自消失——放得下一句、放不下一個群組時只留前者', () => {
    // 它們長出來的東西不一樣大，所以能不能按也是三個各自的答案。
    const wrapper = mountEditor(aNestedCondition(), {
      canAddComparison: true, canAddGroup: false,
    })

    expect(wrapper.findAll('[data-testid="condition-add-comparison"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[data-testid="condition-add-group"]')).toHaveLength(0)
  })

  it('一句比對加得動時，給的是「再加一個條件」而不是「加一個群組」', () => {
    // 那一句留在新群組裡——使用者要的是再加一個條件，不是把剛剛填的丟掉重來。
    const wrapper = mountEditor(comparison('a', 'A'))

    wrapper.get('[data-testid="condition-wrap-in-group"]').trigger('click')

    expect(wrapper.emitted('wrapInGroup')?.[0]).toEqual(['a'])
  })
})
