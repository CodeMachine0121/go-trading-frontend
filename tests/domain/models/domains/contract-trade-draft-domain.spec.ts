import { describe, expect, it } from 'vitest'
import { ContractTradeDraftDomain } from '~/domain/models/domains/contract-trade-draft-domain'
import { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { buildRecord, takerFeeSetting } from '../../../fixtures/contract-trade-journal'

function draftWithFills(fills: ContractTradeDraftFillDto[]): ContractTradeDraftDto {
  return new ContractTradeDraftDto('BTCUSDT', 'long', '10', fills, '', '', '', null, null, [], null)
}

describe('ContractTradeDraftDomain', () => {
  it('新增一筆交易一定要在草稿裡有進場成交，不能只靠既有成交', () => {
    const existingFills = buildRecord().toDomain().toDto().fills
    const draftDomain = new ContractTradeDraftDomain(
      draftWithFills([new ContractTradeDraftFillDto('exit', null, '100000', '0.01', 'taker', '')]),
      takerFeeSetting(),
      existingFills)

    expect(() => draftDomain.toRecordSubmission()).toThrow(ContractTradeRejectedError)
    expect(() => draftDomain.toRecordSubmission()).toThrow('至少要有一筆填好成交價與數量的進場成交')
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

  it('沒有成交列時成交價與數量不算預填', async () => {
    const Decimal = (await import('decimal.js')).default
    const { ContractTradePrefillDto } = await import('~/domain/models/dto/contract-trade-prefill-dto')
    const prefill = new ContractTradePrefillDto(
      'link-412', 'newTrade', null, null, '來自 x・第 1 輪', new Date(), '97,850', null, 'BTCUSDT', 'long',
      new Decimal(10), null, null, null, new Decimal(97850), new Decimal('0.051'))

    const fields = new ContractTradeDraftDomain(draftWithFills([]), takerFeeSetting()).prefilledFields(prefill)

    expect(fields).toEqual(['symbol', 'direction', 'leverage'])
  })
})
