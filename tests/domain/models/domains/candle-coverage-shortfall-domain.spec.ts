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
    const message = messageFor(19, 20)

    expect(message).toContain('19')
    expect(message).toContain('20')
  })

  it('給出兩條出路：看短一點，或把缺的歷史補回來', () => {
    const message = messageFor(19, 20)

    expect(message).toContain('拉近')
    expect(message).toContain('立刻更新')
  })

  it('出路與「要得太多」那一句相反——不叫人縮短區間或看粗一點', () => {
    // 這是這一句存在的唯一理由。兩個方向都調得動，所以講錯方向的話，
    // 使用者會一路往反方向調，而且不會發現。
    const message = messageFor(19, 20)

    expect(message).not.toContain('縮短')
    expect(message).not.toContain('粗')
  })

  it('一根都湊不出來時照樣說得出兩個數字', () => {
    const message = messageFor(0, 1)

    expect(message).toContain('0')
    expect(message).toContain('1')
  })
})
