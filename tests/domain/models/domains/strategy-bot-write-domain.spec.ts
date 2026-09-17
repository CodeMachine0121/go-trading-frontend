import { describe, expect, it } from 'vitest'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'

/** 一台每一條規則都過得了的機器人，好讓每個案例只改它要講的那一格。 */
function aBotWrite(overrides: Partial<{
  name: string
  symbol: string
  tradingStrategyId: number
  triggerIntervalMinutes: number
}> = {}) {
  return new StrategyBotWriteDomain(new StrategyBotWriteDto(
    undefined,
    overrides.name ?? '早盤突破',
    overrides.symbol ?? 'BTCUSDT',
    overrides.tradingStrategyId ?? 9,
    overrides.triggerIntervalMinutes ?? 5,
  ))
}

describe('StrategyBotWriteDomain', () => {
  it('四格都填對就送得出去', () => {
    expect(aBotWrite().isSendable).toBe(true)
    expect(aBotWrite().rejection).toBeNull()
  })

  it.each([
    ['名稱只有空白', { name: '   ' }, '取一個名稱'],
    ['名稱超過上限', { name: '名'.repeat(129) }, '長度上限為 128 個字'],
    ['沒挑交易策略', { tradingStrategyId: 0 }, '必須挑一份交易策略'],
    ['沒說要盯哪一檔', { symbol: '  ' }, '要盯哪一個交易標的'],
    ['觸發間隔是零', { triggerIntervalMinutes: 0 }, '必須大於零'],
    ['觸發間隔超過一天', { triggerIntervalMinutes: 1441 }, '上限是 1440 分鐘'],
  ])('%s就送不出去，並說出是哪一件事', (_situation, overrides, expectedMessage) => {
    const writeDomain = aBotWrite(overrides)

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain(expectedMessage)
  })

  it('一次只說一個理由', () => {
    // 使用者一次只改得動一格；一張同時亮起四個紅字的表單，
    // 第一個反應是不知道要從哪裡開始。
    const writeDomain = aBotWrite({ name: '', symbol: '', triggerIntervalMinutes: 0 })

    expect(writeDomain.rejection).toBe('必須給機器人取一個名稱')
  })

  // 一台機器人不會有自己的一份規則複本——它指名一份，而那正是好幾台共用一份的前提。
  it('送出去的那一份只有機器的事，沒有規則', () => {
    const sendable = aBotWrite({ name: '  早盤突破  ', symbol: '  BTCUSDT  ' }).sendable

    expect(sendable.name).toBe('早盤突破')
    expect(sendable.symbol).toBe('BTCUSDT')
    expect(sendable.tradingStrategyId).toBe(9)
    expect(Object.keys(sendable)).not.toContain('buyCondition')
    expect(Object.keys(sendable)).not.toContain('signalSources')
  })
})
