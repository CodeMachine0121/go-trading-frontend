import { describe, expect, it } from 'vitest'
import { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'

function recordOf(result: string) {
  return new StrategyBotRunRecord(1, new Date('2026-09-16T05:05:00Z'), result).toDomain().toDto()
}

describe('StrategyBotRunRecordDomain', () => {
  it.each([
    ['buy', '買入', 'success'],
    ['sell', '賣出', 'danger'],
    ['hold', '持有', 'neutral'],
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

  it('認不得的結果當成持有，而不是一格空白', () => {
    // 一格空白在一排紀錄裡讀起來像「這一列壞了」。
    const unknown = recordOf('somethingNew')

    expect(unknown.resultLabel).toBe('持有')
    expect(unknown.resultTone).toBe('neutral')
  })

  it('第幾輪與什麼時候原樣帶過來', () => {
    const runRecord = new StrategyBotRunRecord(42, new Date('2026-09-16T05:05:00Z'), 'buy')
      .toDomain().toDto()

    expect(runRecord.runNumber).toBe(42)
    expect(runRecord.ranAt.toISOString()).toBe('2026-09-16T05:05:00.000Z')
  })
})
