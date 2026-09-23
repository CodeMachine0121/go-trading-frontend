import { describe, expect, it } from 'vitest'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

describe('MarketDataKindDomain', () => {
  it.each([
    { declared: 'contractKCandle', expected: 'contractKCandle' },
    { declared: ' ContractKCandle ', expected: 'contractKCandle' },
    { declared: 'kCandle', expected: 'kCandle' },
    // 舊版後端不說、或說了沒見過的——那時只有 K 線這一種。
    { declared: '', expected: 'kCandle' },
    { declared: '選擇權', expected: 'kCandle' },
  ])('「$declared」讀成 $expected', ({ declared, expected }) => {
    expect(new MarketDataKindDomain(declared).value).toBe(expected)
  })

  it.each([
    { declared: 'kCandle', label: 'K 線' },
    { declared: 'contractKCandle', label: '合約行情' },
  ])('$declared 給人看的名字是「$label」', ({ declared, label }) => {
    expect(new MarketDataKindDomain(declared).label()).toBe(label)
  })

  it('合約行情的說明說的是合約行情格：進入點、每一項與「沒有值的一律是零」', () => {
    const guide = new MarketDataKindDomain('contractKCandle').toScriptInputGuideDto()

    expect(guide.entryPoint).toBe('func Calculate(data []indicator.ContractKCandle)')
    expect(guide.heading).toBe('每一格合約行情有什麼')
    const fieldNames = guide.fields.map(field => field.name)
    // 現貨那十項原樣在最前面——`candle.Close` 兩邊都寫得出來。
    expect(fieldNames.slice(0, 10)).toEqual([
      'Symbol', 'OpenTimeUnixSeconds', 'Open', 'High', 'Low', 'Close',
      'Volume', 'QuoteVolume', 'TakerBuyBaseVolume', 'TakerBuyQuoteVolume',
    ])
    expect(fieldNames).toEqual(expect.arrayContaining([
      'TradeCount', 'Mark', 'Index', 'PremiumIndex', 'FundingRate', 'FundingSettledInBar',
      'OpenInterest', 'OpenInterestValue', 'AccountLongShare', 'AccountShortShare',
      'AccountLongShortRatio', 'TopTraderPositionLongShare', 'TopTraderPositionShortShare',
      'TopTraderPositionLongShortRatio',
    ]))
    expect(guide.fields.find(field => field.name === 'Mark')?.type).toBe('indicator.PriceLine')
    expect(guide.fields.find(field => field.name === 'FundingSettledInBar')?.type).toBe('bool')
    expect(guide.notes.some(note => note.includes('沒有值的一律是零'))).toBe(true)
  })

  it('合約行情的說明不說「價量一律是 float64」，而是點出不是 float64 的那幾項', () => {
    const guide = new MarketDataKindDomain('contractKCandle').toScriptInputGuideDto()

    expect(guide.valueTypeNote).not.toContain('一律是 float64')
    expect(guide.valueTypeNote).toContain('TradeCount 是 int64')
    expect(guide.valueTypeNote).toContain('indicator.PriceLine')
    expect(guide.valueTypeNote).toContain('FundingSettledInBar 是 bool')
  })

  it('K 線的說明與這一刀之前一字不差：只列十項、沒有額外提醒', () => {
    const guide = new MarketDataKindDomain('kCandle').toScriptInputGuideDto()

    expect(guide.entryPoint).toBe('func Calculate(data []indicator.KCandle)')
    expect(guide.heading).toBe('每一根 K 線有什麼')
    expect(guide.fields).toHaveLength(10)
    expect(guide.valueTypeNote).toBe('價量一律是 float64，直接算就好。')
    expect(guide.notes).toEqual([])
  })

  it.each([
    { declared: 'kCandle', offersBacktest: true, picksContractTradingSymbol: false },
    // 合約的回測是交易服務的下一刀；標的從合約標的清單挑。
    { declared: 'contractKCandle', offersBacktest: false, picksContractTradingSymbol: true },
  ])('$declared 的工作區：回測 $offersBacktest、合約標的清單 $picksContractTradingSymbol',
    ({ declared, offersBacktest, picksContractTradingSymbol }) => {
      const workbench = new MarketDataKindDomain(declared).toWorkbenchDto()

      expect(workbench.offersBacktest).toBe(offersBacktest)
      expect(workbench.picksContractTradingSymbol).toBe(picksContractTradingSymbol)
    })

  it('同一種才算同一種', () => {
    expect(new MarketDataKindDomain('contractKCandle').isSameAs(new MarketDataKindDomain(' contractkcandle'))).toBe(true)
    expect(new MarketDataKindDomain('contractKCandle').isSameAs(new MarketDataKindDomain(''))).toBe(false)
  })
})
