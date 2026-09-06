import { describe, expect, it } from 'vitest'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

describe('BacktestTimeRangeDomain', () => {
  describe('一打開就有的那一段', () => {
    it('起點是三十天前的當日零點', () => {
      const now = new Date('2026-09-05T13:47:00Z')

      const range = new BacktestTimeRangeDomain(now, now).defaultRangeAt(now)

      expect(range.startTime.toISOString()).toBe('2026-08-06T00:00:00.000Z')
    })

    it('終點是昨天的最後一刻', () => {
      // 刻意停在昨天而不是此刻：今天還沒走完，把它算進去等於拿半天當一天。
      const now = new Date('2026-09-05T13:47:00Z')

      const range = new BacktestTimeRangeDomain(now, now).defaultRangeAt(now)

      expect(range.endTime.toISOString()).toBe('2026-09-04T23:59:59.999Z')
    })

    it('現在是幾點不影響那兩個日期', () => {
      const justAfterMidnight = new Date('2026-09-05T00:00:01Z')
      const justBeforeMidnight = new Date('2026-09-05T23:59:59Z')

      const earlyRange = new BacktestTimeRangeDomain(
        justAfterMidnight, justAfterMidnight).defaultRangeAt(justAfterMidnight)
      const lateRange = new BacktestTimeRangeDomain(
        justBeforeMidnight, justBeforeMidnight).defaultRangeAt(justBeforeMidnight)

      expect(earlyRange.startTime).toEqual(lateRange.startTime)
      expect(earlyRange.endTime).toEqual(lateRange.endTime)
    })

    it('預設出來的那一段自己驗證得過', () => {
      // 預設值與驗證住在同一個模型裡的理由就是這一條：分開放，
      // 預設值遲早會填出一組自己的驗證會拒絕的東西。
      const now = new Date('2026-09-05T13:47:00Z')
      const range = new BacktestTimeRangeDomain(now, now).defaultRangeAt(now)

      expect(() => new BacktestTimeRangeDomain(range.startTime, range.endTime).validate())
        .not.toThrow()
    })
  })

  describe('這一段講不講得通', () => {
    it('起點早於終點就通過', () => {
      expect(() => new BacktestTimeRangeDomain(
        new Date('2026-09-01T00:00:00Z'), new Date('2026-09-05T00:00:00Z')).validate())
        .not.toThrow()
    })

    it('起點與終點同一刻也通過', () => {
      const moment = new Date('2026-09-01T00:00:00Z')

      expect(() => new BacktestTimeRangeDomain(moment, moment).validate()).not.toThrow()
    })

    it('起點晚於終點時說明是時間那一格', () => {
      expect(() => new BacktestTimeRangeDomain(
        new Date('2026-09-10T00:00:00Z'), new Date('2026-09-01T00:00:00Z')).validate())
        .toThrow(new BacktestFieldError('timeRange', '起點不能晚於終點。'))
    })

    it('時間沒填完整時也落在時間那一格', () => {
      // 時間選擇器被清空或只填一半，讀回來就是一個無效的時間值。
      expect(() => new BacktestTimeRangeDomain(
        new Date(Number.NaN), new Date('2026-09-01T00:00:00Z')).validate())
        .toThrowError(BacktestFieldError)
    })
  })
})
