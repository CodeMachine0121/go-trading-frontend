import { describe, expect, it } from 'vitest'
import { MarketplaceListingDomain } from '~/domain/models/domains/marketplace-listing-domain'
import { AvailableStrategiesDto } from '~/domain/models/dto/available-strategies-dto'
import { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'

function publishedOf(id: number, name: string): PublishedStrategyDto {
  return new PublishedStrategyDto(
    id, name, '', 'floatList', 'someone@example.com',
    new Date('2026-09-10T08:00:00.000Z'), [], true, '一串數字')
}

function ownStrategyOf(id: number, name: string): StrategyDto {
  return new StrategyDto(
    id, name, '', new StrategyContentDto('sum := 0.0', 'floatList'), true, true, true)
}

describe('MarketplaceListingDomain', () => {
  it('每一列都說得出它對這個人是什麼', () => {
    // 三種狀態各一列。畫面因此不必比對任何識別碼——比對每多一處，
    // 就多一個會悄悄算錯的地方，而算錯的後果是一顆按不動的按鈕。
    const listing = new MarketplaceListingDomain(
      [publishedOf(1, '我分享的'), publishedOf(2, '我加入的'), publishedOf(3, '還沒收的')],
      new AvailableStrategiesDto([ownStrategyOf(1, '我分享的')], [publishedOf(2, '我加入的')]),
    )

    const rows = listing.toRowDtos()

    expect(rows.map(row => [row.strategy.id, row.mine, row.adopted])).toEqual([
      [1, true, false],
      [2, false, true],
      [3, false, false],
    ])
  })

  it('順序照市集給的來，不重新排', () => {
    // 市集的順序是「最近分享的在前」，而那件事只有市集知道。
    const listing = new MarketplaceListingDomain(
      [publishedOf(3, '丙'), publishedOf(1, '甲'), publishedOf(2, '乙')],
      new AvailableStrategiesDto([], []),
    )

    expect(listing.toRowDtos().map(row => row.strategy.name)).toEqual(['丙', '甲', '乙'])
  })

  it('自己分享的那一支留在清單上', () => {
    // 市集回答的是「外面有什麼」，而自己那一支確實在外面。
    // 把它藏起來會讓人以為分享沒有成功。
    const listing = new MarketplaceListingDomain(
      [publishedOf(1, '我分享的')],
      new AvailableStrategiesDto([ownStrategyOf(1, '我分享的')], []),
    )

    const rows = listing.toRowDtos()

    expect(rows).toHaveLength(1)
    expect(rows[0]?.mine).toBe(true)
  })

  it('市集是空的時候就是沒有列', () => {
    const listing = new MarketplaceListingDomain(
      [], new AvailableStrategiesDto([ownStrategyOf(1, '我的')], []))

    expect(listing.toRowDtos()).toEqual([])
  })
})
