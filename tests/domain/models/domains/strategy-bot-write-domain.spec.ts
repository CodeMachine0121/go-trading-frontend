import { describe, expect, it } from 'vitest'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'

function comparison(sourceLabel: string, signal = 'buy') {
  return new StrategyBotConditionDto('node', null, [], sourceLabel, signal)
}

function source(label: string, strategyId = 9) {
  return new StrategyBotSignalSourceDto(label, strategyId, '1h', [])
}

/** 一台每一條規則都過得了的機器人，好讓每個案例只改它要講的那一格。 */
function aBotWrite(overrides: Partial<{
  name: string
  symbol: string
  triggerIntervalMinutes: number
  signalSources: StrategyBotSignalSourceDto[]
  buyCondition: StrategyBotConditionDto | null
  sellCondition: StrategyBotConditionDto | null
}> = {}) {
  return new StrategyBotWriteDomain(new StrategyBotWriteDto(
    undefined,
    overrides.name ?? '早盤突破',
    overrides.symbol ?? 'BTCUSDT',
    overrides.triggerIntervalMinutes ?? 5,
    overrides.signalSources ?? [source('A')],
    'buyCondition' in overrides ? overrides.buyCondition! : comparison('A'),
    'sellCondition' in overrides ? overrides.sellCondition! : comparison('A', 'sell'),
  ))
}

describe('StrategyBotWriteDomain', () => {
  it('每一格都填對就送得出去', () => {
    expect(aBotWrite().isSendable).toBe(true)
    expect(aBotWrite().rejection).toBeNull()
  })

  it.each([
    ['名稱只有空白', { name: '   ' }, '取一個名稱'],
    ['名稱超過上限', { name: '名'.repeat(129) }, '長度上限為 128 個字'],
    ['沒說要盯哪一檔', { symbol: '  ' }, '要盯哪一個交易標的'],
    ['觸發間隔是零', { triggerIntervalMinutes: 0 }, '必須大於零'],
    ['觸發間隔超過一天', { triggerIntervalMinutes: 1441 }, '上限是 1440 分鐘'],
    ['一個信號來源都沒有', { signalSources: [] }, '至少要有一個信號來源'],
    ['買入條件是空的', { buyCondition: null }, '買入條件還沒放'],
    ['賣出條件是空的', { sellCondition: null }, '賣出條件還沒放'],
  ])('%s就送不出去，並說出是哪一件事', (_situation, overrides, expectedMessage) => {
    const writeDomain = aBotWrite(overrides)

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain(expectedMessage)
  })

  it('代號重複時說出是哪一個代號撞了', () => {
    // 代號是這張表單上少數幾個真的用打字的欄位，所以它擋不住、必須驗。
    const writeDomain = aBotWrite({ signalSources: [source('A'), source('A')] })

    expect(writeDomain.rejection).toContain('「A」重複了')
  })

  it('代號只有空白也不行', () => {
    expect(aBotWrite({ signalSources: [source('  ')] }).rejection)
      .toContain('都要有一個代號')
  })

  it('一次只說一個理由', () => {
    // 使用者一次只改得動一格；一張同時亮起五個紅字的表單，
    // 第一個反應是不知道要從哪裡開始。
    const writeDomain = aBotWrite({ name: '', symbol: '', triggerIntervalMinutes: 0 })

    expect(writeDomain.rejection).toBe('必須給機器人取一個名稱')
  })

  it('條件指到一個沒宣告的代號就送不出去', () => {
    // 這一條原本不驗，理由是畫面上按不出來。積木工作台之後它按得出來了：
    // 把 A 改名成一個當下正被別人用著的代號時，樹上那幾句會停在舊代號上等它不再撞名，
    // 而那個瞬間它們指的就是一個已經不存在的來源。
    const writeDomain = aBotWrite({ buyCondition: comparison('沒有宣告過的代號') })

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain('沒有宣告過的代號')
  })

  it('半成品送不出去，並說得出是哪一塊', () => {
    // 積木工作台讓使用者造得出半成品——剛放下去的群組裡是兩個空位。
    // 那是刻意的（未完成自己會標出來），但半成品不能送出去。
    const halfBuilt = new StrategyBotConditionDto('g', 'and', [], '', '')

    expect(aBotWrite({ buyCondition: halfBuilt }).rejection).toContain('買入條件')
  })

  it('比對還沒選信號也送不出去', () => {
    const noSignal = new StrategyBotConditionDto('c', null, [], 'A', '')

    expect(aBotWrite({ sellCondition: noSignal }).rejection).toContain('賣出條件')
  })
})
