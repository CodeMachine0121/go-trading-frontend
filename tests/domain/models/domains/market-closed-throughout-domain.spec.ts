import { describe, expect, it } from 'vitest'
import { MarketClosedThroughoutDomain } from '~/domain/models/domains/market-closed-throughout-domain'

describe('要看的那一段裡市場根本沒開過時該說的那一句話', () => {
  function message(): string {
    return new MarketClosedThroughoutDomain().message()
  }

  it('說出發生了什麼事：這一段時間市場沒有交易', () => {
    // 只說「算不出來」等於沒說——使用者會先懷疑自己的算式。
    expect(message()).toContain('這一段時間市場沒有交易')
  })

  it('給出唯一有用的那一條出路：改看有交易的時間', () => {
    expect(message()).toContain('有交易的時間')
  })

  it('不叫人去調另外兩句的那些地方——調了也沒有用', () => {
    // 這是這一句存在的唯一理由。週六不會因為換了刻度就長出成交，
    // 把區間拉長也只是拉進更多沒有交易的時間。而那些地方都調得動，
    // 所以講錯方向的話，使用者會一路白調而不會發現。
    expect(message()).not.toContain('刻度')
    expect(message()).not.toContain('縮短')
    expect(message()).not.toContain('拉長')
  })

  it('不與「湊不出最少可算根數」共用出路——補歷史對這一種沒有用', () => {
    expect(message()).not.toContain('補')
    expect(message()).not.toContain('至少要')
  })

  it('不指名任何一個控制項——同一句話要在兩個畫面上都成立', () => {
    // 圖表上是拉圖，指標計算畫面上是填一格；指名一個，就在另一個畫面上
    // 叫使用者去按一個不存在的東西。
    expect(message()).not.toContain('立刻更新')
    expect(message()).not.toContain('按鈕')
    expect(message()).not.toContain('選單')
  })

  it('說出為什麼會這樣：這一檔不是全天候交易的', () => {
    // 使用者填的數字沒有錯，錯的是他挑的那個時候——不說清楚，他會一直改那個數字。
    expect(message()).toContain('全天候')
  })
})
