import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'

function recordOf(result: string) {
  return new StrategyBotRunRecord(
    1, new Date('2026-09-16T05:05:00Z'), result, null, null, null).toDomain().toDto()
}

describe('StrategyBotRunRecordDomain', () => {
  it.each([
    ['buy', '買入', 'success'],
    ['sell', '賣出', 'danger'],
    ['hold', '持有', 'neutral'],
    ['conflict', '衝突', 'warning'],
  ])('%s 講成「%s」，語氣是 %s', (result, expectedLabel, expectedTone) => {
    // 買入與賣出是兩個相反的動作——它們在一排紀錄裡必須一眼分得出來，
    // 而那是業務決定不是配色偏好，所以它住在這裡而不是元件裡。
    const runRecord = recordOf(result)

    expect(runRecord.resultLabel).toBe(expectedLabel)
    expect(runRecord.resultTone).toBe(expectedTone)
  })

  it('買入與賣出的語氣一定不一樣', () => {
    // 這一條是上面那張表真正在守的東西：兩個相反的動作長成一樣，
    // 一排紀錄就讀不出它做過什麼。
    expect(recordOf('buy').resultTone).not.toBe(recordOf('sell').resultTone)
  })

  it('衝突與持有分得開——一個在等市場，一個在等人', () => {
    // 持有的機器人在等市場；衝突的機器人在等它的主人去改一個條件，
    // 而它在那之前一句話都不會說。記成同一個字，等於把歷史上唯一
    // 「請你去處理」的那一列藏起來。
    expect(recordOf('conflict').resultLabel).not.toBe(recordOf('hold').resultLabel)
    expect(recordOf('conflict').resultTone).not.toBe(recordOf('hold').resultTone)
  })

  it('只有衝突要人去處理', () => {
    expect(recordOf('conflict').needsAttention).toBe(true)
    expect(recordOf('hold').needsAttention).toBe(false)
    expect(recordOf('buy').needsAttention).toBe(false)
    expect(recordOf('sell').needsAttention).toBe(false)
  })

  it('衝突用警告而不是危險——機器人沒有壞，是它被交代了做不到的事', () => {
    // 用危險的語氣會讓它看起來跟停擺同一級，而停擺是它自己出了問題。
    expect(recordOf('conflict').resultTone).toBe('warning')
    expect(recordOf('conflict').resultTone).not.toBe(recordOf('sell').resultTone)
  })

  it('認不得的結果當成持有，而不是一格空白', () => {
    // 一格空白在一排紀錄裡讀起來像「這一列壞了」。
    const unknown = recordOf('somethingNew')

    expect(unknown.resultLabel).toBe('持有')
    expect(unknown.resultTone).toBe('neutral')
    expect(unknown.needsAttention).toBe(false)
  })

  it('第幾輪與什麼時候原樣帶過來', () => {
    const runRecord = new StrategyBotRunRecord(
      42, new Date('2026-09-16T05:05:00Z'), 'buy', null, null, null).toDomain().toDto()

    expect(runRecord.runNumber).toBe(42)
    expect(runRecord.ranAt.toISOString()).toBe('2026-09-16T05:05:00.000Z')
  })
})

// 那一輪建議過的部位寫成一整句：怎麼寫是業務規則，不是元件該判斷的事。
describe('StrategyBotRunRecordDomain 那一輪建議過什麼（現貨）', () => {
  it('建議過的開倉金額、停損與停利寫成一句', () => {
    const runRecord = new StrategyBotRunRecord(
      1, new Date('2026-09-16T05:05:00Z'), 'sell',
      new Decimal(5000), new Decimal('66105.915'), new Decimal('60971.475'),
    ).toDomain().toDto()

    expect(runRecord.suggestionText).toBe('押 5000 · 停損 66105.915 · 停利 60971.475')
  })

  it('只建議過停損的那一輪就只寫金額與停損——與今天一字不差', () => {
    const runRecord = new StrategyBotRunRecord(
      1, new Date('2026-09-16T05:05:00Z'), 'buy',
      new Decimal(5000), new Decimal('62255.085'), null,
    ).toDomain().toDto()

    expect(runRecord.suggestionText).toBe('押 5000 · 停損 62255.085')
  })

  it('沒有建議的那一輪整段不寫', () => {
    expect(recordOf('hold').suggestionText).toBeNull()
  })

  it('一個零的止損價寫成「0」，不當成沒有', () => {
    // 距離整個價格那麼遠的止損價正好是零——荒謬但合法，
    // 而把它當成沒有會讓那一輪少講一件它真的講過的事。
    const runRecord = new StrategyBotRunRecord(
      1, new Date('2026-09-16T05:05:00Z'), 'buy',
      new Decimal(5000), new Decimal(0), null,
    ).toDomain().toDto()

    expect(runRecord.suggestionText).toBe('押 5000 · 停損 0')
  })

  it('那兩個數字叫「停損」與「停利」，不叫「止損」與「止盈」', () => {
    // 這兩組詞在後端是兩件不同的事：這裡的距離從**最新價**量起，
    // 而回測那邊的從**進場價**量起。混用等於把兩件事說成一件。
    const text = new StrategyBotRunRecord(
      1, new Date('2026-09-16T05:05:00Z'), 'sell',
      new Decimal(5000), new Decimal(1), new Decimal(2),
    ).toDomain().toDto().suggestionText

    expect(text).not.toContain('止損')
    expect(text).not.toContain('止盈')
  })
})

// 合約那一輪要對得上當時那則訊息：方向、幾倍、保證金、名目，缺一不可。
describe('StrategyBotRunRecordDomain 那一輪建議過什麼（合約）', () => {
  function contractRecord(
    direction: string | null,
    leverage: string | null,
    notional: string | null,
    stopLoss: string | null,
    takeProfit: string | null,
  ) {
    return new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'sell',
      new Decimal(1000),
      stopLoss === null ? null : new Decimal(stopLoss),
      takeProfit === null ? null : new Decimal(takeProfit),
      direction,
      leverage === null ? null : new Decimal(leverage),
      notional === null ? null : new Decimal(notional),
    ).toDomain().toDto()
  }

  it.each([
    {
      name: '做空、5 倍、帶出場價',
      record: () => contractRecord('short', '5', '5000', '102', '96'),
      expected: '做空 5 倍 · 保證金 1000 · 名目 5000 · 停損 102 · 停利 96',
    },
    {
      name: '做多、1 倍、沒設出場價',
      record: () => contractRecord('long', '1', '1000', null, null),
      expected: '做多 1 倍 · 保證金 1000 · 名目 1000',
    },
    {
      name: '認不得的方向不猜，其餘照寫',
      record: () => contractRecord('sideways', '5', '5000', null, null),
      expected: '5 倍 · 保證金 1000 · 名目 5000',
    },
    {
      name: '方向與倍數都說不出時，從保證金開始寫',
      record: () => contractRecord(null, null, '5000', null, null),
      expected: '保證金 1000 · 名目 5000',
    },
    {
      name: '只記得方向時仍是合約的寫法',
      record: () => contractRecord('long', null, null, null, null),
      expected: '做多 · 保證金 1000',
    },
  ])('$name', ({ record, expected }) => {
    expect(record().suggestionText).toBe(expected)
  })

  it('交易所不收的那一輪沒有任何數字，整段不寫', () => {
    const runRecord = new StrategyBotRunRecord(
      1, new Date('2026-09-24T05:05:00Z'), 'buy', null, null, null, null, null, null,
    ).toDomain().toDto()

    expect(runRecord.suggestionText).toBeNull()
  })
})
