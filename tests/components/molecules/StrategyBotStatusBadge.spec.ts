import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import StrategyBotStatusBadge from '~/components/molecules/StrategyBotStatusBadge.vue'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

function mountBadge(runState: Partial<StrategyBotRunStateDto> = {}) {
  return mount(StrategyBotStatusBadge, {
    props: {
      runState: new StrategyBotRunStateDto(
        runState.isRunning ?? false,
        runState.isHalted ?? false,
        runState.isConflicting ?? false,
        runState.statusLabel ?? new LocalizedTextVo('已停止', 'Stopped'),
        runState.statusTone ?? 'neutral',
        runState.haltReasonLabel ?? null,
        runState.lastSentSignalLabel ?? new LocalizedTextVo('還沒送出過', 'None sent yet'),
        runState.canStart ?? true,
        runState.canStop ?? false,
        runState.canEdit ?? true,
        runState.editBlockedReason ?? null,
      ),
    },
  })
}

describe('StrategyBotStatusBadge', () => {
  it('說出它現在是什麼狀態', () => {
    const wrapper = mountBadge({ isRunning: true, statusLabel: new LocalizedTextVo('執行中', 'Running'), statusTone: 'success' })

    expect(wrapper.get('[data-testid="bot-status-badge"]').text()).toBe('執行中')
  })

  it('停擺時把原因一起說出來，不必點開', () => {
    // 這份清單是使用者唯一會發現機器人出事的地方，所以原因要跟著標籤走。
    const wrapper = mountBadge({
      isHalted: true,
      statusLabel: new LocalizedTextVo('停擺', 'Halted'),
      statusTone: 'danger',
      haltReasonLabel: new LocalizedTextVo('機器人金鑰不被接受', 'The bot key was not accepted'),
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
      isRunning: true, statusLabel: new LocalizedTextVo('執行中', 'Running'), statusTone: 'success', isConflicting: true,
    })

    expect(wrapper.get('[data-testid="bot-status-badge"]').text()).toBe('執行中')
    expect(wrapper.get('[data-testid="bot-conflicting-badge"]').text()).toBe('規則打架了')
  })

  it('沒打架時不畫那個標籤', () => {
    expect(mountBadge().find('[data-testid="bot-conflicting-badge"]').exists()).toBe(false)
  })

  it('切成英文時，狀態、停擺原因與打架的標籤都換成英文', async () => {
    const wrapper = mountBadge({
      isHalted: true,
      isConflicting: true,
      statusLabel: new LocalizedTextVo('停擺', 'Halted'),
      statusTone: 'danger',
      haltReasonLabel: new LocalizedTextVo('機器人金鑰不被接受', 'The bot key was not accepted'),
    })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="bot-status-badge"]').text()).toBe('Halted')
    expect(wrapper.get('[data-testid="bot-halt-reason"]').text()).toBe('The bot key was not accepted')
    expect(wrapper.get('[data-testid="bot-conflicting-badge"]').text()).toBe('Rules conflict')
  })
})
