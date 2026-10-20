import { describe, expect, it } from 'vitest'
import { StrategyBotRunStateDomain } from '~/domain/models/domains/strategy-bot-run-state-domain'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotWatchedSymbol } from '~/domain/models/entities/strategy-bot-watched-symbol'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'

function aWatchedSymbol(overrides: Partial<{
  symbol: string
  conflicting: boolean
  haltReason: StrategyBotHaltReasonVo | null
}> = {}) {
  return new StrategyBotWatchedSymbol(
    overrides.symbol ?? 'BTCUSDT', '', overrides.conflicting ?? false, overrides.haltReason ?? null, null)
}

function aBot(overrides: Partial<{
  runState: StrategyBotRunStateVo
  haltReason: StrategyBotHaltReasonVo | null
  watchedSymbols: StrategyBotWatchedSymbol[]
}> = {}) {
  return new StrategyBotRunStateDomain(new StrategyBot(
    3, '早盤突破', overrides.watchedSymbols ?? [aWatchedSymbol()], 5, 9, '黃金交叉',
    overrides.runState ?? 'stopped',
    'haltReason' in overrides ? overrides.haltReason! : null,
    null,
  ))
}

describe('StrategyBotRunStateDomain', () => {
  it('執行中時給的是停止鍵，不是播放鍵', () => {
    // 一台機器人只有兩種狀態，同時看到兩顆互斥的鍵沒有任何一種讀法是對的。
    const running = aBot({ runState: 'running' }).toDto()

    expect(running.canStop).toBe(true)
    expect(running.canStart).toBe(false)
    expect(running.statusLabel.in('zh-TW')).toBe('執行中')
    expect(running.statusTone).toBe('success')
  })

  it('已停止時給的是播放鍵', () => {
    const stopped = aBot().toDto()

    expect(stopped.canStart).toBe(true)
    expect(stopped.canStop).toBe(false)
    expect(stopped.statusLabel.in('zh-TW')).toBe('已停止')
    expect(stopped.statusTone).toBe('neutral')
  })

  it('停擺與一般的已停止分得出來，而且更醒目', () => {
    // 這份清單是使用者唯一會發現機器人出事的地方，所以停擺不能看起來像他自己按的停止。
    const halted = aBot({ haltReason: 'credentialRejected' }).toDto()

    expect(halted.isHalted).toBe(true)
    expect(halted.statusLabel.in('zh-TW')).toBe('停擺')
    expect(halted.statusTone).toBe('danger')
    expect(halted.haltReasonLabel?.in('zh-TW')).toBe('機器人金鑰不被接受')
  })

  it.each([
    ['strategyUnavailable', '有一支策略腳本找不到了'],
    ['scriptFailed', '有一支策略腳本算不出來'],
    ['orderFlowRefused', '它要的訂單流超過一次能給的範圍（天數或價位數）'],
    ['credentialRejected', '機器人金鑰不被接受'],
    ['destinationNotFound', '找不到這個聊天室'],
  ])('每一種停擺原因各自說得出是哪一種（%s）', (haltReason, expectedLabel) => {
    // 要做的事完全不同：換一支策略腳本、修算式、縮短回看或放寬價位寬度、重填金鑰、重填代號。
    expect(aBot({ haltReason: haltReason as StrategyBotHaltReasonVo }).toDto().haltReasonLabel?.in('zh-TW'))
      .toBe(expectedLabel)
  })

  it('認不得的停擺原因當成沒有停擺，而不是顯示一格空白', () => {
    // 空白在這份清單上的意思是「這台沒事」——那是最糟的一種誤讀。
    const unknown = aBot({ haltReason: 'somethingNew' as StrategyBotHaltReasonVo }).toDto()

    expect(unknown.isHalted).toBe(false)
    expect(unknown.haltReasonLabel).toBeNull()
  })

  it.each([
    { name: '一個標的規則打架', watchedSymbols: [aWatchedSymbol(), aWatchedSymbol({ symbol: 'ETHUSDT', conflicting: true })], expected: true },
    { name: '沒有標的規則打架', watchedSymbols: [aWatchedSymbol(), aWatchedSymbol({ symbol: 'ETHUSDT' })], expected: false },
  ])('$name：規則打架與執行中並列，不是取代它', ({ watchedSymbols, expected }) => {
    const runState = aBot({ runState: 'running', watchedSymbols }).toDto()

    expect(runState.isRunning).toBe(true)
    expect(runState.isConflicting).toBe(expected)
    expect(runState.statusLabel.in('zh-TW')).toBe('執行中')
  })

  it.each([
    {
      name: '執行中、一個標的停擺',
      bot: () => aBot({ runState: 'running', watchedSymbols: [aWatchedSymbol(), aWatchedSymbol({ symbol: 'ETHUSDT', haltReason: 'scriptFailed' })] }),
      status: '執行中', haltedWatchedSymbols: '1 個標的停擺', english: '1 symbol halted',
    },
    {
      name: '執行中、兩個標的停擺',
      bot: () => aBot({ runState: 'running', watchedSymbols: [aWatchedSymbol({ haltReason: 'orderFlowRefused' }), aWatchedSymbol({ symbol: 'ETHUSDT', haltReason: 'scriptFailed' }), aWatchedSymbol({ symbol: 'SOLUSDT' })] }),
      status: '執行中', haltedWatchedSymbols: '2 個標的停擺', english: '2 symbols halted',
    },
    {
      name: '整台停擺時不另說幾個標的停擺',
      bot: () => aBot({ haltReason: 'scriptFailed', watchedSymbols: [aWatchedSymbol({ haltReason: 'scriptFailed' })] }),
      status: '停擺', haltedWatchedSymbols: undefined, english: undefined,
    },
    {
      name: '沒有標的停擺',
      bot: () => aBot({ runState: 'running' }),
      status: '執行中', haltedWatchedSymbols: undefined, english: undefined,
    },
    {
      name: '認不得的標的停擺原因當成沒有',
      bot: () => aBot({ runState: 'running', watchedSymbols: [aWatchedSymbol({ haltReason: 'somethingNew' as StrategyBotHaltReasonVo })] }),
      status: '執行中', haltedWatchedSymbols: undefined, english: undefined,
    },
  ])('$name', ({ bot, status, haltedWatchedSymbols, english }) => {
    const runState = bot().toDto()

    expect(runState.statusLabel.in('zh-TW')).toBe(status)
    expect(runState.haltedWatchedSymbolsLabel?.in('zh-TW')).toBe(haltedWatchedSymbols)
    expect(runState.haltedWatchedSymbolsLabel?.in('en')).toBe(english)
  })

  it('執行中時編輯不給按，並說得出為什麼', () => {
    // 那顆灰掉的鍵沒有理由的話就是個謎。
    const running = aBot({ runState: 'running' }).toDto()

    expect(running.canEdit).toBe(false)
    expect(running.editBlockedReason?.in('zh-TW')).toContain('要先停止')
  })

  it('停下來就編輯得動了', () => {
    const stopped = aBot().toDto()

    expect(stopped.canEdit).toBe(true)
    expect(stopped.editBlockedReason).toBeNull()
  })
})

describe('StrategyBotRunStateDomain 的英文那一份', () => {
  it.each([
    { name: '停擺', bot: () => aBot({ haltReason: 'credentialRejected' }), status: 'Halted', reason: 'The bot token was not accepted' },
    { name: '執行中', bot: () => aBot({ runState: 'running' }), status: 'Running', reason: undefined },
    { name: '已停止', bot: () => aBot(), status: 'Stopped', reason: undefined },
  ])('$name說得出英文的狀態與停擺原因', ({ bot, status, reason }) => {
    const runState = bot().toDto()

    expect(runState.statusLabel.in('en')).toBe(status)
    expect(runState.haltReasonLabel?.in('en')).toBe(reason)
  })

  it('編輯不給按的理由也說得出英文', () => {
    expect(aBot({ runState: 'running' }).toDto().editBlockedReason?.in('en'))
      .toBe('This bot is running; stop it before editing')
  })
})
