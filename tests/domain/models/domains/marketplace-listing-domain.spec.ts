import { describe, expect, it } from 'vitest'
import { MarketplaceListingDomain } from '~/domain/models/domains/marketplace-listing-domain'
import { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'

function publishedOf(id: number, name: string): PublishedStrategyScriptDto {
  return new PublishedStrategyScriptDto(
    id, name, '', 'floatList', 'someone@example.com',
    new Date('2026-09-10T08:00:00.000Z'), [], true, '一串數字')
}

function ownStrategyScriptOf(id: number, name: string): StrategyScriptDto {
  return new StrategyScriptDto(
    id, name, '', new StrategyScriptContentDto('sum := 0.0', 'floatList'), true, true, true)
}

describe('MarketplaceListingDomain', () => {
  it('每一列都說得出它對這個人是什麼', () => {
    // 三種狀態各一列。畫面因此不必比對任何識別碼——比對每多一處，
    // 就多一個會悄悄算錯的地方，而算錯的後果是一顆按不動的按鈕。
    const listing = new MarketplaceListingDomain(
      [publishedOf(1, '我分享的'), publishedOf(2, '我加入的'), publishedOf(3, '還沒收的')],
      new AvailableStrategyScriptsDto([ownStrategyScriptOf(1, '我分享的')], [publishedOf(2, '我加入的')]),
    )

    const rows = listing.toRowDtos()

    expect(rows.map(row => [row.strategyScript.id, row.mine, row.adopted])).toEqual([
      [1, true, false],
      [2, false, true],
      [3, false, false],
    ])
  })

  it('順序照市集給的來，不重新排', () => {
    // 市集的順序是「最近分享的在前」，而那件事只有市集知道。
    const listing = new MarketplaceListingDomain(
      [publishedOf(3, '丙'), publishedOf(1, '甲'), publishedOf(2, '乙')],
      new AvailableStrategyScriptsDto([], []),
    )

    expect(listing.toRowDtos().map(row => row.strategyScript.name)).toEqual(['丙', '甲', '乙'])
  })

  it('自己分享的那一支留在清單上', () => {
    // 市集回答的是「外面有什麼」，而自己那一支確實在外面。
    // 把它藏起來會讓人以為分享沒有成功。
    const listing = new MarketplaceListingDomain(
      [publishedOf(1, '我分享的')],
      new AvailableStrategyScriptsDto([ownStrategyScriptOf(1, '我分享的')], []),
    )

    const rows = listing.toRowDtos()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.mine).toBe(true)
  })

  it('市集是空的時候就是沒有列', () => {
    const listing = new MarketplaceListingDomain(
      [], new AvailableStrategyScriptsDto([ownStrategyScriptOf(1, '我的')], []))

    expect(listing.toRowDtos()).toEqual([])
  })
})
