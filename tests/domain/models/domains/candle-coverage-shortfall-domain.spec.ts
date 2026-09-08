import { describe, expect, it } from 'vitest'
import { CandleCoverageShortfallDomain } from '~/domain/models/domains/candle-coverage-shortfall-domain'
import { CandleCoverageShortfallVo } from '~/domain/models/vo/candle-coverage-shortfall-vo'

describe('走完的刻度區間連一個值都湊不出來時該說的那一句話', () => {
  function messageFor(availableCandleCount: number, minimumCandleCount: number): string {
    return new CandleCoverageShortfallDomain(
      new CandleCoverageShortfallVo(availableCandleCount, minimumCandleCount)).message()
  }

  it('說出湊得出幾根，也說出至少要幾根', () => {
    // 少了任何一個，使用者都不知道差多少：只說「不夠」等於沒說。
    //
    // **兩個數字各自綁在自己的那半句上**，不是只檢查它們有出現。兩個數字都在、
    // 卻裝反了的句子讀起來完全通順（「只湊得出 20 根，至少要 19 根」），
    // 而那是這個功能最容易犯的錯——刻意用容易分辨的一對數字讓它現形。
    const message = messageFor(19, 20)

    expect(message).toMatch(/湊得出 19 根/)
    expect(message).toMatch(/至少要 20 根/)
  })

  it('兩個數字裝反了要看得出來', () => {
    // 同一句話換成相反的一對數字，那兩半也必須跟著換——否則上面那兩條斷言
    // 對「裝反」是瞎的。
    const message = messageFor(20, 19)

    expect(message).toMatch(/湊得出 20 根/)
    expect(message).toMatch(/至少要 19 根/)
  })

  it('給出兩條出路：更細的彙總刻度，或把缺的歷史補回來', () => {
    const message = messageFor(19, 20)

    expect(message).toContain('更細的彙總刻度')
    expect(message).toContain('歷史')
  })

  it('出路與「要得太多」那一句相反——不叫人縮短區間或改粗一點', () => {
    // 這是這一句存在的唯一理由。兩個方向都調得動，所以講錯方向的話，
    // 使用者會一路往反方向調，而且不會發現。
    const message = messageFor(19, 20)

    expect(message).not.toContain('縮短')
    expect(message).not.toContain('粗')
  })

  it('不指名任何一個控制項——同一句話要在兩個畫面上都成立', () => {
    // 「立刻更新」只在圖表上有；指標計算畫面沒有那顆按鈕，也沒有可以拉的圖。
    // 指名它就是在那個畫面上叫使用者去按一個不存在的東西。
    const message = messageFor(19, 20)

    expect(message).not.toContain('立刻更新')
    expect(message).not.toContain('拉近')
  })

  it('一根都湊不出來時照樣說得出兩個數字', () => {
    const message = messageFor(0, 1)

    expect(message).toContain('0')
    expect(message).toContain('1')
  })
})
