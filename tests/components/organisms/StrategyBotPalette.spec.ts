import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotPalette from '~/components/organisms/StrategyBotPalette.vue'
import { ConditionBlockDrawerDto } from '~/domain/models/dto/condition-block-drawer-dto'
import { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'

function comparisonOption(label: string, enabled = true, disabledReason = '') {
  return new ConditionBlockOptionDto(
    new ConditionBlockVo('comparison', label, null), `${label} 等於…`, enabled, disabledReason)
}

function groupOption() {
  return new ConditionBlockOptionDto(
    new ConditionBlockVo('group', '', 'and'), '全部成立（且）', true, '')
}

function mountPalette(options: {
  sources?: StrategyBotSignalSourceDto[]
  comparisons?: ConditionBlockOptionDto[]
  hasNoStrategies?: boolean
  usageWarnings?: Record<number, string>
} = {}) {
  const sources = options.sources ?? [new StrategyBotSignalSourceDto('MACD 交叉', 9, '5m', [])]

  return mount(StrategyBotPalette, {
    props: {
      sources,
      blockDrawer: new ConditionBlockDrawerDto(
        options.comparisons ?? sources.map(source => comparisonOption(source.label)),
        [groupOption()],
        '',
      ),
      strategyOptions: [{ value: 9, label: 'MACD 交叉' }, { value: 10, label: 'ATR 濾網' }],
      intervalOptions: [{ value: '5m', label: '五分鐘' }],
      parameterNamesByStrategyId: { 9: ['快線期數'] },
      canAdd: true,
      signalSourceLimit: 10,
      hasNoStrategies: options.hasNoStrategies ?? false,
      usageWarnings: options.usageWarnings ?? {},
    },
  })
}

describe('StrategyBotPalette：信號來源就是積木', () => {
  it('一塊積木寫的是那支策略的名字，不是一個代號字母', () => {
    // 「A 等於買入」是一句看不出自己在說什麼的話——使用者得自己記住 A 是哪一支，
    // 而他同時在讀的是一棵三層深的樹。
    const wrapper = mountPalette()

    expect(wrapper.get('[data-testid="block-comparison:MACD 交叉:"]').text())
      .toContain('MACD 交叉')
  })

  it('來源與積木是同一份，不是兩份——所以清單上沒有第二個它', () => {
    const wrapper = mountPalette()

    expect(wrapper.findAll('[data-testid="signal-source-row"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid^="block-comparison:"]')).toHaveLength(1)
  })

  it('每一塊都抓得起來，包括現在點不下去的那幾塊', () => {
    // 點不下去問的是「剛剛選的那個空位收不收它」，而拖是到落點才知道結果的。
    const wrapper = mountPalette({ comparisons: [comparisonOption('MACD 交叉', false, '滿了')] })
    const block = wrapper.get('[data-testid="block-comparison:MACD 交叉:"]')

    expect(block.attributes('draggable')).toBe('true')
    expect(block.attributes('aria-disabled')).toBe('true')
  })

  it('點一塊放得進去的就往上傳；點不下去的那幾塊什麼都不做', async () => {
    const wrapper = mountPalette({ comparisons: [comparisonOption('MACD 交叉', false, '滿了')] })

    await wrapper.get('[data-testid="block-comparison:MACD 交叉:"]').trigger('click')
    expect(wrapper.emitted('pick')).toBeUndefined()

    await wrapper.get('[data-testid="block-group::and"]').trigger('click')
    expect(wrapper.emitted('pick')).toHaveLength(1)
  })
})

describe('StrategyBotPalette：設定收在它自己底下', () => {
  it('一開始收著——收起來時一個來源就是一行', () => {
    // 十個來源也還是十行，而不是把拼的地方擠到畫面外。
    const wrapper = mountPalette()

    expect(wrapper.find('[data-testid="signal-source-settings-panel-0"]').exists()).toBe(false)
  })

  it('按那顆齒輪才打開，裡面是這一個來源自己的事', async () => {
    const wrapper = mountPalette()

    await wrapper.get('[data-testid="signal-source-settings-0"]').trigger('click')

    const panel = wrapper.get('[data-testid="signal-source-settings-panel-0"]')
    expect(panel.find('[data-testid="signal-source-label-input"]').exists()).toBe(true)
    expect(panel.find('[data-testid="signal-source-interval-select"]').exists()).toBe(true)
    expect(panel.find('[data-testid="signal-source-parameter-input"]').exists()).toBe(true)
  })

  it('再按一次就收起來', async () => {
    const wrapper = mountPalette()

    await wrapper.get('[data-testid="signal-source-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="signal-source-settings-0"]').trigger('click')

    expect(wrapper.find('[data-testid="signal-source-settings-panel-0"]').exists()).toBe(false)
  })
})

describe('StrategyBotPalette：移除與空狀態', () => {
  it('還被條件用著的來源照樣刪得掉，只是先說一聲', async () => {
    const wrapper = mountPalette({ usageWarnings: { 0: '條件裡還在用「MACD 交叉」' } })

    const remove = wrapper.get('[data-testid="signal-source-remove"]')
    expect(remove.attributes('disabled')).toBeUndefined()

    await remove.trigger('click')

    expect(wrapper.emitted('remove')?.[0]).toEqual([0])
  })

  it('一個來源都沒有時說得出下一步', () => {
    expect(mountPalette({ sources: [], comparisons: [] })
      .get('[data-testid="signal-sources-empty"]').text()).toContain('加一支策略')
  })

  it('一支會吐訊號的策略都沒有時，說的是另一件事', () => {
    // 那時按新增只會得到一個空的下拉選單，而畫面明明知道原因。
    expect(mountPalette({ sources: [], comparisons: [], hasNoStrategies: true })
      .get('[data-testid="signal-sources-no-strategies"]').text()).toContain('策略庫')
  })
})
