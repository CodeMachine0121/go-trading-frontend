import { describe, expect, it } from 'vitest'
import { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'

function comparison(sourceLabel: string, signal = 'buy') {
  return new TradingStrategyConditionDto('node', null, [], sourceLabel, signal)
}

function source(label: string, strategyScriptId = 9) {
  return new TradingStrategySignalSourceDto(label, strategyScriptId, '1h', [])
}

/** 一份每一條規則都過得了的交易策略，好讓每個案例只改它要講的那一格。 */
function aBotWrite(overrides: Partial<{
  name: string
  signalSources: TradingStrategySignalSourceDto[]
  buyCondition: TradingStrategyConditionDto | null
  sellCondition: TradingStrategyConditionDto | null
}> = {}) {
  return new TradingStrategyWriteDomain(new TradingStrategyWriteDto(
    undefined,
    overrides.name ?? '黃金交叉',
    overrides.signalSources ?? [source('A')],
    'buyCondition' in overrides ? overrides.buyCondition! : comparison('A'),
    'sellCondition' in overrides ? overrides.sellCondition! : comparison('A', 'sell'),
  ))
}

describe('TradingStrategyWriteDomain', () => {
  it('每一格都填對就送得出去', () => {
    expect(aBotWrite().isSendable).toBe(true)
    expect(aBotWrite().rejection).toBeNull()
  })

  it.each([
    ['名稱只有空白', { name: '   ' }, '取一個名稱'],
    ['名稱超過上限', { name: '名'.repeat(129) }, '長度上限為 128 個字'],
    ['一個訊號來源都沒有', { signalSources: [] }, '至少要有一個訊號來源'],
    ['買入一格都沒勾', { buyCondition: null }, '兩邊都要至少勾一格'],
    ['賣出一格都沒勾', { sellCondition: null }, '兩邊都要至少勾一格'],
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
    const writeDomain = aBotWrite({ name: '', signalSources: [] })

    expect(writeDomain.rejection).toBe('必須給交易策略取一個名稱')
  })

  it('條件指到一個沒宣告的代號就送不出去', () => {
    // 這是唯一造得出來的壞條件：改代號時撞到別人用著的名字，
    // 那一列會停在舊名字上等它不再撞名。
    const writeDomain = aBotWrite({ buyCondition: comparison('沒有宣告過的代號') })

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain('沒有宣告過的代號')
  })

  it('形狀不必驗——條件是由一張表寫出來的，而表寫不出不合法的形狀', () => {
    // 群組至少兩句、每一句都有信號，都是它產生方式的必然結果。
    // 去驗一個造不出反例的規則，是替一個不會發生的情況維護一段程式。
    const wellFormed = new TradingStrategyConditionDto('g', 'and', [
      comparison('A', 'buy'),
      comparison('A', 'hold'),
    ], '', '')

    expect(aBotWrite({ buyCondition: wellFormed }).isSendable).toBe(true)
  })

  it('條件指到一個沒宣告的代號就送不出去', () => {
    // 這一條原本不驗，理由是畫面上按不出來。積木工作台之後它按得出來了：
    // 把 A 改名成一個當下正被別人用著的代號時，樹上那幾句會停在舊代號上等它不再撞名，
    // 而那個瞬間它們指的就是一個已經不存在的來源。
    const writeDomain = aBotWrite({ buyCondition: comparison('沒有宣告過的代號') })

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain('沒有宣告過的代號')
  })

  it('形狀不必驗——條件是由一張表寫出來的，而表寫不出不合法的形狀', () => {
    // 群組至少兩句、每一句都有信號，都是它產生方式的必然結果。
    // 去驗一個造不出反例的規則，是替一個不會發生的情況維護一段程式。
    const wellFormed = new TradingStrategyConditionDto('g', 'and', [
      comparison('A', 'buy'),
      comparison('A', 'hold'),
    ], '', '')

    expect(aBotWrite({ buyCondition: wellFormed }).isSendable).toBe(true)
  })

  it('條件指到一個沒宣告的代號就送不出去', () => {
    // 這一條原本不驗，理由是畫面上按不出來。積木工作台之後它按得出來了：
    // 把 A 改名成一個當下正被別人用著的代號時，樹上那幾句會停在舊代號上等它不再撞名，
    // 而那個瞬間它們指的就是一個已經不存在的來源。
    const writeDomain = aBotWrite({ buyCondition: comparison('沒有宣告過的代號') })

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain('沒有宣告過的代號')
  })
})
