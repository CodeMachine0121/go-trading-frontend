import { describe, expect, it } from 'vitest'
import { ContractTradeDraftDomain } from '~/domain/models/domains/contract-trade-draft-domain'
import { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import Decimal from 'decimal.js'
import { buildRecord, takerFeeSetting } from '../../../fixtures/contract-trade-journal'

function draftWithFills(fills: ContractTradeDraftFillDto[]): ContractTradeDraftDto {
  return new ContractTradeDraftDto('BTCUSDT', 'long', '10', fills, '', '', '', null, null, [], null)
}

describe('ContractTradeDraftDomain', () => {
  it.each([
    { name: '做多止損在下、止盈在上', direction: 'long', stop: '96380', target: '100785', stopText: '往下 1.58%', targetText: '往上 2.92%' },
    { name: '做空止損在上、止盈在下', direction: 'short', stop: '99000', target: '95000', stopText: '往上 1.10%', targetText: '往下 2.99%' },
    { name: '沒填就不說', direction: 'long', stop: '', target: '', stopText: null, targetText: null },
  ] as const)('止損止盈離進場均價多遠：$name', ({ direction, stop, target, stopText, targetText }) => {
    const preview = new ContractTradeDraftDomain(
      new ContractTradeDraftDto('BTCUSDT', direction, '10', [
        new ContractTradeDraftFillDto('entry', null, '97905', '0.030', 'taker', ''),
        new ContractTradeDraftFillDto('entry', null, '97960', '0.021', 'taker', ''),
      ], stop, target, '', null, null, [], null),
      takerFeeSetting()).toPreviewDto()

    expect(preview.stopLossDistanceText).toBe(stopText)
    expect(preview.takeProfitDistanceText).toBe(targetText)
  })

  it.each([
    { name: '從機器人連結帶入時說出和參考價差多少', referencePrice: new Decimal('97850'), expected: '比參考價高 0.08%（滑點）' },
    { name: '不是從連結來就不說', referencePrice: null, expected: null },
  ])('$name', ({ referencePrice, expected }) => {
    const preview = new ContractTradeDraftDomain(
      new ContractTradeDraftDto('BTCUSDT', 'long', '10', [
        new ContractTradeDraftFillDto('entry', null, '97905', '0.030', 'taker', ''),
        new ContractTradeDraftFillDto('entry', null, '97960', '0.021', 'taker', ''),
      ], '', '', '', null, null, [], 'link-1', referencePrice),
      takerFeeSetting()).toPreviewDto()

    expect(preview.entrySlippageText).toBe(expected)
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
      'link-412', 'newTrade', null, null, '來自 x・第 1 輪', new Date(), '97,850', null, 'BTCUSDT', 'long',
      new Decimal(10), null, null, null, new Decimal(97850), new Decimal('0.051'), '做多 10 倍', 'success')

    const fields = new ContractTradeDraftDomain(draftWithFills([]), takerFeeSetting()).prefilledFields(prefill)

    expect(fields).toEqual(['symbol', 'direction', 'leverage'])
  })
})
