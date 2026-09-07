import { describe, expect, it } from 'vitest'
import { LiveUpdateNoticeDomain } from '~/domain/models/domains/live-update-notice-domain'

/** 三件事實的順序與建構子一致：在不在交易時段、有沒有即時名額、是不是斷了。 */
function noticeFor(
  isWithinTradingSession: boolean, hasLiveUpdates: boolean, isStalled: boolean,
) {
  return new LiveUpdateNoticeDomain(isWithinTradingSession, hasLiveUpdates, isStalled).notice()
}

describe('LiveUpdateNoticeDomain', () => {
  it('一切正常時什麼都不說', () => {
    expect(noticeFor(true, true, false)).toBeNull()
  })

  it('市場收盤時說收盤', () => {
    expect(noticeFor(false, true, false)?.value).toBe('marketClosed')
  })

  it('這一檔沒有即時名額時說沒有名額', () => {
    expect(noticeFor(true, false, false)?.value).toBe('noLivePlace')
  })

  it('即時斷掉時說斷掉', () => {
    expect(noticeFor(true, true, true)?.value).toBe('stalled')
  })

  it('收盤壓過即時斷掉', () => {
    // 收盤時即時本來就會停。兩句都說出來，會讓人以為出了兩件事。
    expect(noticeFor(false, true, true)?.value).toBe('marketClosed')
  })

  it('收盤壓過沒有名額', () => {
    expect(noticeFor(false, false, false)?.value).toBe('marketClosed')
  })

  it('沒有名額壓過即時斷掉', () => {
    // 一句的意思是「等到明天也一樣」，一句是「等一下會自己好」。
    // 兩句都成立時，說會自己好的那一句是在騙人。
    expect(noticeFor(true, false, true)?.value).toBe('noLivePlace')
  })

  it('三件事同時成立時仍然只說最要緊的那一句', () => {
    expect(noticeFor(false, false, true)?.value).toBe('marketClosed')
  })

  it('沒有名額與即時斷掉的語氣不同', () => {
    // 一句是現況、一句是異常，畫面照著語氣畫，不必自己判斷哪一句比較嚴重。
    expect(noticeFor(true, false, false)?.tone).toBe('info')
    expect(noticeFor(true, true, true)?.tone).toBe('warning')
  })
})
