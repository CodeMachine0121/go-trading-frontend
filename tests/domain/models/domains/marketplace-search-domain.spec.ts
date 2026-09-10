import { describe, expect, it } from 'vitest'
import { MarketplaceSearchDomain } from '~/domain/models/domains/marketplace-search-domain'
import { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'
import { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'

/** 一列，只帶會影響比對結果的那幾個字。 */
function rowOf(
  id: number, name: string,
  { description = '', publisherEmail = 'someone@example.com' } = {},
): MarketplaceListingRowDto {
  return new MarketplaceListingRowDto(
    new PublishedStrategyDto(
      id, name, description, 'floatList', publisherEmail,
      new Date('2026-09-10T08:00:00.000Z'), [], true, '一串數字'),
    false,
    false,
  )
}

const twentyMovingAverage = rowOf(1, '二十根均線')
const bollinger = rowOf(2, '布林通道')

function namesMatching(query: string, rows = [twentyMovingAverage, bollinger]): string[] {
  return new MarketplaceSearchDomain(query).matching(rows).map(row => row.strategy.name)
}

describe('MarketplaceSearchDomain', () => {
  it.each([
    ['一個詞只留下對得上的', '均線', ['二十根均線']],
    ['沒有打字就是全部', '', ['二十根均線', '布林通道']],
    ['只打空白等同沒有打', '   ', ['二十根均線', '布林通道']],
    ['前後的空白不算', '　均線　', ['二十根均線']],
    ['好幾個詞時每一個都要對上', '均線 二十', ['二十根均線']],
    ['其中一個詞對不上就一列都不留', '均線 布林', []],
    ['一個字都對不上時是空的，不是全部', '不存在的東西', []],
  ])('%s', (_title, query, expectedNames) => {
    expect(namesMatching(query)).toEqual(expectedNames)
  })

  it('好幾個詞落在不同欄位也算全部對上', () => {
    // 「每一個都要對上」說的是每個詞都要出現，不是要出現在同一段字裡。
    const rows = [rowOf(1, '二十根均線', { description: '抓短線轉折' }), bollinger]

    expect(namesMatching('均線 轉折', rows)).toEqual(['二十根均線'])
  })

  it('不分大小寫', () => {
    const rows = [rowOf(1, 'MA20')]

    expect(namesMatching('ma20', rows)).toEqual(['MA20'])
    expect(namesMatching('MA20', rows)).toEqual(['MA20'])
  })

  it('說明也在比對範圍內', () => {
    // 算式看不到的時候，說明是別人唯一的判斷依據——它當然要搜得到。
    const rows = [rowOf(1, '甲', { description: '抓短線轉折' }), bollinger]

    expect(namesMatching('轉折', rows)).toEqual(['甲'])
  })

  it('是誰分享的也在比對範圍內', () => {
    const rows = [rowOf(1, '甲', { publisherEmail: 'ming@example.com' }), bollinger]

    expect(namesMatching('ming', rows)).toEqual(['甲'])
  })

  it('沒寫說明不影響其他欄位對得上', () => {
    const rows = [rowOf(1, '布林通道', { description: '' })]

    expect(namesMatching('布林', rows)).toEqual(['布林通道'])
  })

  it('指標值種類不比對——那是一個代號，沒有人拿它來找東西', () => {
    // 搜「floatList」搜出一堆策略，只會讓人以為搜尋壞了。
    expect(namesMatching('floatList')).toEqual([])
  })

  it('留下來的順序照交進來的，不重新排', () => {
    // 市集的順序是「最近分享的在前」，而搜尋只決定看得到哪幾張，不決定順序。
    const rows = [rowOf(3, '丙均線'), rowOf(1, '甲均線'), rowOf(2, '乙均線')]

    expect(namesMatching('均線', rows)).toEqual(['丙均線', '甲均線', '乙均線'])
  })

  it('交進來的那一份不被改動', () => {
    // 畫面手上那一份是它的清單，不是這裡的暫存區。
    const rows = [twentyMovingAverage, bollinger]

    new MarketplaceSearchDomain('均線').matching(rows)

    expect(rows.map(row => row.strategy.name)).toEqual(['二十根均線', '布林通道'])
  })
})
