import { describe, expect, it } from 'vitest'
import { ContractTradeDraftDomain } from '~/domain/models/domains/contract-trade-draft-domain'
import { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import Decimal from 'decimal.js'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { buildRecord, takerFeeSetting } from '../../../fixtures/contract-trade-journal'

function draftWithFills(fills: ContractTradeDraftFillDto[]): ContractTradeDraftDto {
  return new ContractTradeDraftDto('BTCUSDT', 'long', '10', fills, '', '', '', null, null, [], null)
}

describe('ContractTradeDraftDomain', () => {
  it.each([
    { name: '做多止損在下、止盈在上', direction: 'long', stop: '96380', target: '100785', stopText: '往下 1.58%', targetText: '往上 2.92%', stopEnglish: '1.58% below', targetEnglish: '2.92% above' },
    { name: '做空止損在上、止盈在下', direction: 'short', stop: '99000', target: '95000', stopText: '往上 1.10%', targetText: '往下 2.99%', stopEnglish: '1.10% above', targetEnglish: '2.99% below' },
    { name: '沒填就不說', direction: 'long', stop: '', target: '', stopText: null, targetText: null, stopEnglish: null, targetEnglish: null },
  ] as const)('止損止盈離進場均價多遠：$name', ({ direction, stop, target, stopText, targetText, stopEnglish, targetEnglish }) => {
    const preview = new ContractTradeDraftDomain(
      new ContractTradeDraftDto('BTCUSDT', direction, '10', [
        new ContractTradeDraftFillDto('entry', null, '97905', '0.030', 'taker', ''),
        new ContractTradeDraftFillDto('entry', null, '97960', '0.021', 'taker', ''),
      ], stop, target, '', null, null, [], null),
      takerFeeSetting()).toPreviewDto()

    expect(preview.stopLossDistanceText?.in('zh-TW') ?? null).toBe(stopText)
    expect(preview.takeProfitDistanceText?.in('zh-TW') ?? null).toBe(targetText)
    expect(preview.stopLossDistanceText?.in('en') ?? null).toBe(stopEnglish)
    expect(preview.takeProfitDistanceText?.in('en') ?? null).toBe(targetEnglish)
  })

  it.each([
    { name: '從機器人連結帶入時說出和參考價差多少', referencePrice: new Decimal('97850'), existingFills: null, expected: '比參考價高 0.08%（滑點）' },
    { name: '不是從連結來就不說', referencePrice: null, existingFills: null, expected: null },
    { name: '對既有持倉加倉時不說（滑點只算在開倉那一筆交易上）', referencePrice: new Decimal('97850'), existingFills: buildRecord({ status: 'open' }).toDomain().toDto().fills, expected: null },
  ])('$name', ({ referencePrice, existingFills, expected }) => {
    const preview = new ContractTradeDraftDomain(
      new ContractTradeDraftDto('BTCUSDT', 'long', '10', [
        new ContractTradeDraftFillDto('entry', null, '97905', '0.030', 'taker', ''),
        new ContractTradeDraftFillDto('entry', null, '97960', '0.021', 'taker', ''),
      ], '', '', '', null, null, [], 'link-1', referencePrice),
      takerFeeSetting(), existingFills).toPreviewDto()

    expect(preview.entrySlippageText?.in('zh-TW') ?? null).toBe(expected)
  })

  it('新增一筆交易一定要在草稿裡有進場成交，不能只靠既有成交', () => {
    const existingFills = buildRecord().toDomain().toDto().fills
    const draftDomain = new ContractTradeDraftDomain(
      draftWithFills([new ContractTradeDraftFillDto('exit', null, '100000', '0.01', 'taker', '')]),
      takerFeeSetting(),
      existingFills)

    expect(() => draftDomain.toRecordSubmission()).toThrow(TradeRejectedError)
    expect(() => draftDomain.toRecordSubmission()).toThrow('至少要有一筆填好開倉價與數量的開倉')
  })

  it('數量讀不懂時手續費先算零', () => {
    const preview = new ContractTradeDraftDomain(
      draftWithFills([new ContractTradeDraftFillDto('entry', null, '97905', '', 'taker', '')]),
      takerFeeSetting()).toPreviewDto()

    expect(preview.fees[0]?.automaticFeeText).toBe('0.00')
  })

  it('成交價有千分位也讀得懂', () => {
    const preview = new ContractTradeDraftDomain(
      draftWithFills([new ContractTradeDraftFillDto('entry', null, '97,905', '0.03', 'taker', '')]),
      takerFeeSetting()).toPreviewDto()

    expect(preview.averageEntryPriceText).toBe('97,905')
  })

  it('沒有成交列時成交價與數量不算預填', () => {
    const prefill = new ContractTradePrefillDto(
      'link-412', 'newTrade', null, null, new LocalizedTextVo('來自 x・第 1 輪', 'From x · run 1'), new Date(), '97,850', null,
      'BTCUSDT', 'long', new Decimal(10), null, null, null, new Decimal(97850), new Decimal('0.051'),
      new LocalizedTextVo('做多 10 倍', 'Long 10x'), 'success')

    const fields = new ContractTradeDraftDomain(draftWithFills([]), takerFeeSetting()).prefilledFields(prefill)

    expect(fields).toEqual(['symbol', 'direction', 'leverage'])
  })
})
