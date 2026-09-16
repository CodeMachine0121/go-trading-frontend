import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotSignalSourceFields from '~/components/molecules/StrategyBotSignalSourceFields.vue'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'

function mountFields(options: {
  sources?: StrategyBotSignalSourceDto[]
  canAdd?: boolean
  hasNoStrategies?: boolean
  removalBlockedReasons?: Record<number, string>
} = {}) {
  return mount(StrategyBotSignalSourceFields, {
    props: {
      sources: options.sources ?? [],
      strategyOptions: options.hasNoStrategies ? [] : [{ value: 9, label: '均線' }],
      intervalOptions: [
        { value: '5m', label: '五分鐘' },
        { value: '1h', label: '一小時' },
      ],
      parameterNamesByStrategyId: { 9: ['回看根數'] },
      canAdd: options.canAdd ?? true,
      signalSourceLimit: 10,
      hasNoStrategies: options.hasNoStrategies ?? false,
      removalBlockedReasons: options.removalBlockedReasons ?? {},
    },
  })
}

describe('StrategyBotSignalSourceFields', () => {
  it('一支訊號種類的策略都沒有時，說出真正的下一步而不是給一顆通往空選單的按鈕', () => {
    // 畫面明明知道原因；知道原因卻保持沉默，是把使用者留在原地自己猜。
    // 而且要說對是哪一種「沒有」——他可能有五支策略，只是沒有一支是訊號種類的。
    const wrapper = mountFields({ hasNoStrategies: true })

    const message = wrapper.get('[data-testid="signal-sources-no-strategies"]').text()
    expect(message).toContain('訊號種類的策略')
    expect(message).toContain('策略庫')
    // 提示文字是畫面上的字，不是 markdown——星號會原樣顯示給使用者看。
    expect(message).not.toContain('*')
    expect(wrapper.find('[data-testid="signal-source-add"]').exists()).toBe(false)
  })

  it('有策略可挑時才給新增鍵', () => {
    expect(mountFields().find('[data-testid="signal-source-add"]').exists()).toBe(true)
  })

  it('到了上限時說出上限，而不是讓按鈕默默消失', () => {
    // 少了這一句，那顆消失的按鈕與「一支訊號策略都沒有」那一種消失長得一模一樣——
    // 而兩者要做的事完全不同。
    const wrapper = mountFields({ canAdd: false })

    expect(wrapper.find('[data-testid="signal-source-add"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="signal-sources-at-limit"]').text()).toContain('10 個')
  })

  it('那支策略宣告了旋鈕，就出現那幾格', () => {
    const wrapper = mountFields({
      sources: [new StrategyBotSignalSourceDto('A', 9, '1h', [])],
    })

    expect(wrapper.findAll('[data-testid="signal-source-parameter-input"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('回看根數')
  })

  it('還被條件用著的來源，移除鍵按不動，並說出是哪裡在用它', () => {
    const wrapper = mountFields({
      sources: [new StrategyBotSignalSourceDto('A', 9, '1h', [])],
      removalBlockedReasons: { 0: '條件裡還在用「A」，要先把那幾句改掉或刪掉' },
    })

    expect(wrapper.get('[data-testid="signal-source-remove"]').attributes('disabled'))
      .toBeDefined()
    expect(wrapper.get('[data-testid="signal-source-removal-blocked"]').text())
      .toContain('「A」')
  })

  it('一個來源都沒有時說得出下一步', () => {
    expect(mountFields().get('[data-testid="signal-sources-empty"]').text())
      .toContain('條件就挑得到它的代號')
  })
})
