import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotStatusBadge from '~/components/molecules/StrategyBotStatusBadge.vue'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'

function mountBadge(runState: Partial<StrategyBotRunStateDto> = {}) {
  return mount(StrategyBotStatusBadge, {
    props: {
      runState: new StrategyBotRunStateDto(
        runState.isRunning ?? false,
        runState.isHalted ?? false,
        runState.isConflicting ?? false,
        runState.statusLabel ?? '已停止',
        runState.statusTone ?? 'neutral',
        runState.haltReasonLabel ?? '',
        runState.lastSentSignalLabel ?? '還沒送出過',
        runState.canStart ?? true,
        runState.canStop ?? false,
        runState.canEdit ?? true,
        runState.editBlockedReason ?? '',
      ),
    },
  })
}

describe('StrategyBotStatusBadge', () => {
  it('說出它現在是什麼狀態', () => {
    const wrapper = mountBadge({ isRunning: true, statusLabel: '執行中', statusTone: 'success' })

    expect(wrapper.get('[data-testid="bot-status-badge"]').text()).toBe('執行中')
  })

  it('停擺時把原因一起說出來，不必點開', () => {
    // 這份清單是使用者唯一會發現機器人出事的地方，所以原因要跟著標籤走。
    const wrapper = mountBadge({
      isHalted: true,
      statusLabel: '停擺',
      statusTone: 'danger',
      haltReasonLabel: '機器人金鑰不被接受',
    })

    expect(wrapper.get('[data-testid="bot-status-badge"]').text()).toBe('停擺')
    expect(wrapper.get('[data-testid="bot-halt-reason"]').text()).toBe('機器人金鑰不被接受')
  })

  it('沒有停擺時不畫那一行', () => {
    expect(mountBadge().find('[data-testid="bot-halt-reason"]').exists()).toBe(false)
  })

  it('規則打架與狀態並列，不是取代它', () => {
    // 機器人還在跑，但它現在什麼都不會說。
    const wrapper = mountBadge({
      isRunning: true, statusLabel: '執行中', statusTone: 'success', isConflicting: true,
    })

    expect(wrapper.get('[data-testid="bot-status-badge"]').text()).toBe('執行中')
    expect(wrapper.get('[data-testid="bot-conflicting-badge"]').text()).toBe('規則打架了')
  })

  it('沒打架時不畫那個標籤', () => {
    expect(mountBadge().find('[data-testid="bot-conflicting-badge"]').exists()).toBe(false)
  })
})
