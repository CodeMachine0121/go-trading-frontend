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
    const runRecord = new StrategyBotRunRecord(42, new Date('2026-09-16T05:05:00Z'), 'buy')
      .toDomain().toDto()

    expect(runRecord.runNumber).toBe(42)
    expect(runRecord.ranAt.toISOString()).toBe('2026-09-16T05:05:00.000Z')
  })
})
