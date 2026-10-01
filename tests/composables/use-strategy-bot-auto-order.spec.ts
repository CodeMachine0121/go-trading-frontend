// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { useStrategyBotAutoOrder } from '~/composables/use-strategy-bot-auto-order'
import { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import { AutoOrderSwitchResultDto } from '~/domain/models/dto/auto-order-switch-result-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

function botDto(id: number, autoOrderEnabled: boolean) {
  return new StrategyBotDto(
    id, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    new StrategyBotRunStateDto(
      true, false, false, new LocalizedTextVo('執行中', 'Running'), 'success', null, new LocalizedTextVo('買入', 'Buy'), false, true, false, null),
    null, 'kCandle', new UntranslatedTextVo('BTCUSDT'), null, `/strategy-bots/${id}`, autoOrderEnabled)
}

const NOT_CONFIGURED = new AutoOrderRefusalDto(3, new UntranslatedTextVo('請先完成幣安交易金鑰設定，才能打開自動下單'), true)

const strategyBotApplication = {
  enableAutoOrder: vi.fn(),
  disableAutoOrder: vi.fn(),
}

function autoOrderUnderTest() {
  return useStrategyBotAutoOrder(strategyBotApplication as unknown as StrategyBotApplication)
}

beforeEach(() => {
  vi.clearAllMocks()
  strategyBotApplication.enableAutoOrder.mockResolvedValue(
    new AutoOrderSwitchResultDto(botDto(3, true), null))
  strategyBotApplication.disableAutoOrder.mockResolvedValue(botDto(3, false))
})

describe('useStrategyBotAutoOrder：打開', () => {
  it('交易服務答應了才交回開著的那一台', async () => {
    const autoOrder = autoOrderUnderTest()

    const switched = await autoOrder.switchAutoOrder(3, true)

    expect(strategyBotApplication.enableAutoOrder).toHaveBeenCalledWith(3)
    expect(switched?.autoOrderEnabled).toBe(true)
    expect(autoOrder.refusalFor(3)).toBeNull()
  })

  it('被拒時什麼都不交回，拒絕只掛在那一台上', async () => {
    strategyBotApplication.enableAutoOrder.mockResolvedValue(
      new AutoOrderSwitchResultDto(null, NOT_CONFIGURED))
    const autoOrder = autoOrderUnderTest()

    const switched = await autoOrder.switchAutoOrder(3, true)

    expect(switched).toBeNull()
    expect(autoOrder.refusalFor(3)).toEqual(NOT_CONFIGURED)
    expect(autoOrder.refusalFor(4)).toBeNull()
  })

  it('送出期間記著是哪一台，回來後放掉', async () => {
    let finish: (result: AutoOrderSwitchResultDto) => void = () => {}
    strategyBotApplication.enableAutoOrder.mockReturnValue(
      new Promise<AutoOrderSwitchResultDto>((resolve) => {
        finish = resolve
      }))
    const autoOrder = autoOrderUnderTest()

    const switching = autoOrder.switchAutoOrder(3, true)
    expect(autoOrder.switchingStrategyBotId.value).toBe(3)
    finish(new AutoOrderSwitchResultDto(botDto(3, true), null))
    await switching

    expect(autoOrder.switchingStrategyBotId.value).toBeNull()
  })

  it('再按一次時上一次的拒絕先收掉', async () => {
    strategyBotApplication.enableAutoOrder.mockResolvedValueOnce(
      new AutoOrderSwitchResultDto(null, NOT_CONFIGURED))
    const autoOrder = autoOrderUnderTest()
    await autoOrder.switchAutoOrder(3, true)

    await autoOrder.switchAutoOrder(3, true)

    expect(autoOrder.refusalFor(3)).toBeNull()
  })
})

describe('useStrategyBotAutoOrder：關掉', () => {
  it('打開被拒之後再關掉，那一句拒絕跟著收掉', async () => {
    strategyBotApplication.enableAutoOrder.mockResolvedValueOnce(
      new AutoOrderSwitchResultDto(null, NOT_CONFIGURED))
    const autoOrder = autoOrderUnderTest()
    await autoOrder.switchAutoOrder(3, true)

    await autoOrder.switchAutoOrder(3, false)

    expect(autoOrder.refusalFor(3)).toBeNull()
  })

  it('直接關掉，不經過打開那一條', async () => {
    const autoOrder = autoOrderUnderTest()

    const switched = await autoOrder.switchAutoOrder(3, false)

    expect(strategyBotApplication.disableAutoOrder).toHaveBeenCalledWith(3)
    expect(strategyBotApplication.enableAutoOrder).not.toHaveBeenCalled()
    expect(switched?.autoOrderEnabled).toBe(false)
  })
})

describe('useStrategyBotAutoOrder：其他失敗', () => {
  it.each([
    { error: new BackendRequestRejectedError('找不到這台策略機器人'), expected: '找不到這台策略機器人' },
    { error: new BackendUnreachableError('http://localhost:8080/strategy-bots/3/auto-order'), expected: '連不上' },
    { error: 'not an error', expected: '自動下單沒有切換成功。' },
  ])('照它說的講，只掛在那一台上：$expected', async ({ error, expected }) => {
    strategyBotApplication.disableAutoOrder.mockRejectedValue(error)
    const autoOrder = autoOrderUnderTest()

    const switched = await autoOrder.switchAutoOrder(3, false)

    expect(switched).toBeNull()
    expect(autoOrder.failureMessageFor(3)?.in('zh-TW')).toContain(expected)
    expect(autoOrder.failureMessageFor(4)).toBeNull()
  })

  it.each([
    { error: 'not an error', expected: 'Auto-order could not be switched.' },
    // 後端的原話不翻：換成英文時照樣是它說的那一句。
    { error: new BackendRequestRejectedError('找不到這台策略機器人'), expected: '找不到這台策略機器人' },
  ])('英文那一份：$expected', async ({ error, expected }) => {
    strategyBotApplication.disableAutoOrder.mockRejectedValue(error)
    const autoOrder = autoOrderUnderTest()

    await autoOrder.switchAutoOrder(3, false)

    expect(autoOrder.failureMessageFor(3)?.in('en')).toBe(expected)
  })
})
