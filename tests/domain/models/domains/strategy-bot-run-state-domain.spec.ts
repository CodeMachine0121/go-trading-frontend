import { describe, expect, it } from 'vitest'
import { StrategyBotRunStateDomain } from '~/domain/models/domains/strategy-bot-run-state-domain'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'

function aBot(overrides: Partial<{
  runState: StrategyBotRunStateVo
  lastSentSignal: string
  haltReason: StrategyBotHaltReasonVo | null
  conflicting: boolean
}> = {}) {
  return new StrategyBotRunStateDomain(new StrategyBot(
    3, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    overrides.runState ?? 'stopped',
    overrides.lastSentSignal ?? '',
    'haltReason' in overrides ? overrides.haltReason! : null,
    overrides.conflicting ?? false,
  ))
}

describe('StrategyBotRunStateDomain', () => {
  it('執行中時給的是停止鍵，不是播放鍵', () => {
    // 一台機器人只有兩種狀態，同時看到兩顆互斥的鍵沒有任何一種讀法是對的。
    const running = aBot({ runState: 'running' }).toDto()

    expect(running.canStop).toBe(true)
    expect(running.canStart).toBe(false)
    expect(running.statusLabel).toBe('執行中')
    expect(running.statusTone).toBe('success')
  })

  it('已停止時給的是播放鍵', () => {
    const stopped = aBot().toDto()

    expect(stopped.canStart).toBe(true)
    expect(stopped.canStop).toBe(false)
    expect(stopped.statusLabel).toBe('已停止')
    expect(stopped.statusTone).toBe('neutral')
  })

  it('停擺與一般的已停止分得出來，而且更醒目', () => {
    // 這份清單是使用者唯一會發現機器人出事的地方，所以停擺不能看起來像他自己按的停止。
    const halted = aBot({ haltReason: 'credentialRejected' }).toDto()

    expect(halted.isHalted).toBe(true)
    expect(halted.statusLabel).toBe('停擺')
    expect(halted.statusTone).toBe('danger')
    expect(halted.haltReasonLabel).toBe('機器人金鑰不被接受')
  })

  it.each([
    ['strategyUnavailable', '有一支策略腳本找不到了'],
    ['scriptFailed', '有一支策略腳本算不出來'],
    ['credentialRejected', '機器人金鑰不被接受'],
    ['destinationNotFound', '找不到這個聊天室'],
  ])('四種停擺原因各自說得出是哪一種（%s）', (haltReason, expectedLabel) => {
    // 四者要做的事完全不同：換一支策略腳本、修算式、重填金鑰、重填代號。
    expect(aBot({ haltReason: haltReason as StrategyBotHaltReasonVo }).toDto().haltReasonLabel)
      .toBe(expectedLabel)
  })

  it('認不得的停擺原因當成沒有停擺，而不是顯示一格空白', () => {
    // 空白在這份清單上的意思是「這台沒事」——那是最糟的一種誤讀。
    const unknown = aBot({ haltReason: 'somethingNew' as StrategyBotHaltReasonVo }).toDto()

    expect(unknown.isHalted).toBe(false)
    expect(unknown.haltReasonLabel).toBe('')
  })

  it('規則打架與執行中並列，不是取代它', () => {
    // 機器人還在跑，但它現在什麼都不會說，而且會一直不說下去。
    const conflicting = aBot({ runState: 'running', conflicting: true }).toDto()

    expect(conflicting.isRunning).toBe(true)
    expect(conflicting.isConflicting).toBe(true)
    expect(conflicting.statusLabel).toBe('執行中')
  })

  it.each([
    ['buy', '買入'],
    ['sell', '賣出'],
    ['hold', '持有'],
  ])('上次訊號 %s 講成人話', (lastSentSignal, expectedLabel) => {
    expect(aBot({ lastSentSignal }).toDto().lastSentSignalLabel).toBe(expectedLabel)
  })

  it('沒送過任何訊號是一種狀態，不是空白', () => {
    // 空白讀起來像「這一欄壞了」，而「還沒送出過」是一個完全正常的狀態。
    expect(aBot().toDto().lastSentSignalLabel).toBe('還沒送出過')
  })

  it('執行中時編輯不給按，並說得出為什麼', () => {
    // 那顆灰掉的鍵沒有理由的話就是個謎。
    const running = aBot({ runState: 'running' }).toDto()

    expect(running.canEdit).toBe(false)
    expect(running.editBlockedReason).toContain('要先停止')
  })

  it('停下來就編輯得動了', () => {
    const stopped = aBot().toDto()

    expect(stopped.canEdit).toBe(true)
    expect(stopped.editBlockedReason).toBe('')
  })
})
