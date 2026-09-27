// @vitest-environment nuxt
import Decimal from 'decimal.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeAlreadyOpenError } from '~/domain/errors/trade-already-open-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import { buildRecord, contractTradeRecordProxyMock, kCandleContractProxyMock, tradingStrategyProxyMock } from '../fixtures/contract-trade-journal'

const recordProxy = contractTradeRecordProxyMock()
const tradingStrategyProxy = tradingStrategyProxyMock()
const settingProxy = { findSetting: vi.fn(), saveFeeRates: vi.fn() }
const tagProxy = { listTags: vi.fn(), createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn() }

function prefill(overrides: Partial<Record<keyof ContractTradePrefill, unknown>> = {}): ContractTradePrefill {
  const values = {
    journalLinkIdentifier: 'link-412', mode: 'newTrade', targetTradeId: null, strategyBotName: 'BTC 趨勢跟隨',
    runNumber: 412, ranAt: new Date('2026-09-25T06:00:00Z'), symbol: 'BTCUSDT', direction: 'long',
    leverage: new Decimal(10), plannedStopLossPrice: new Decimal(96380), plannedTakeProfitPrice: new Decimal(100785),
    tradingStrategyId: 5, tradingStrategyName: 'BTC 趨勢跟隨', referencePrice: new Decimal(97850),
    suggestedQuantity: new Decimal('0.051'), ...overrides,
  } as Record<keyof ContractTradePrefill, never>

  return new ContractTradePrefill(
    values.journalLinkIdentifier, values.mode, values.targetTradeId, values.strategyBotName, values.runNumber,
    values.ranAt, values.symbol, values.direction, values.leverage, values.plannedStopLossPrice,
    values.plannedTakeProfitPrice, values.tradingStrategyId, values.tradingStrategyName, values.referencePrice,
    values.suggestedQuantity)
}

function draftUnderTest(existingRecord: ContractTradeRecordDto | null = null) {
  return useContractTradeDraft(
    { timeZoneIdentifier: () => 'UTC', existingRecord: () => existingRecord },
    new ContractTradeJournalApplication(new ContractTradeJournalService(
      recordProxy as unknown as IContractTradeRecordProxy,
      tradingStrategyProxy as unknown as ITradingStrategyProxy,
      kCandleContractProxyMock() as unknown as IKCandleContractProxy)),
    new TradeJournalSettingApplication(new TradeJournalSettingService(
      settingProxy as unknown as ITradeJournalSettingProxy, tagProxy as unknown as ITradeTagProxy)),
    new TradingStrategyApplication(new TradingStrategyService(tradingStrategyProxy as unknown as ITradingStrategyProxy)),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  settingProxy.findSetting.mockResolvedValue(new TradeJournalSetting(new Decimal('0.02'), new Decimal('0.05')))
  tagProxy.listTags.mockResolvedValue([new TradeTag(1, 'setup', '突破'), new TradeTag(2, 'mistake', '追價進場')])
  tradingStrategyProxy.listTradingStrategies.mockResolvedValue([])
})

describe('useContractTradeDraft：記一筆', () => {
  it('一開始就有一筆進場成交，時間預設現在', () => {
    const { fills, dirty, prefilledFields } = draftUnderTest()

    expect(fills.value).toHaveLength(1)
    expect(fills.value[0]?.kind).toBe('entry')
    expect(fills.value[0]?.filledAtText).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(dirty.value).toBe(false)
    expect(prefilledFields.value.size).toBe(0)
  })

  it('讀進手續費率、只列出型態標籤，輸入成交時即時預覽', async () => {
    const draft = draftUnderTest()
    await draft.loadReferenceData()
    draft.symbol.value = 'BTCUSDT'
    draft.fills.value[0]!.priceText = '97905'
    draft.fills.value[0]!.quantityText = '0.030'
    draft.addFill('entry')
    draft.fills.value[1]!.priceText = '97960'
    draft.fills.value[1]!.quantityText = '0.021'
    draft.plannedStopLossText.value = '96380'

    expect(draft.setupTags.value.map(tag => tag.name)).toEqual(['突破'])
    expect(draft.preview.value.averageEntryPriceText).toBe('97,927.6')
    expect(draft.preview.value.stopLossDistanceText).toBe('往下 1.58%')
    expect(draft.preview.value.plannedRiskText).toBe('78.93')
    expect(draft.preview.value.fees[0]?.automaticFeeText).toBe('1.47')
    expect(draft.dirty.value).toBe(true)
  })

  it('讀不到參考資料時說出原因', async () => {
    settingProxy.findSetting.mockRejectedValue(new BackendUnreachableError('http://x'))
    const draft = draftUnderTest()

    await draft.loadReferenceData()

    expect(draft.referenceFailureMessage.value).toContain('連不上交易服務')
  })

  it('刪掉一筆成交', () => {
    const draft = draftUnderTest()
    draft.addFill('exit')

    draft.removeFill(draft.fills.value[0]!.key)

    expect(draft.fills.value.map(fill => fill.kind)).toEqual(['exit'])
  })

  it('儲存後不再算改過，回傳這一筆', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    const draft = draftUnderTest()
    draft.symbol.value = 'btcusdt'
    draft.fills.value[0]!.priceText = '97905'
    draft.fills.value[0]!.quantityText = '0.030'
    draft.fills.value[0]!.filledAtText = '2026-09-25T06:03'

    const saved = await draft.save()

    expect(saved?.id).toBe(27)
    expect(draft.dirty.value).toBe(false)
    expect(recordProxy.recordTrade.mock.calls[0]?.[0].firstEntryFill.filledAt.toISOString()).toBe('2026-09-25T06:03:00.000Z')
  })

  it('時間讀不懂時不帶時間', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    const draft = draftUnderTest()
    draft.symbol.value = 'BTCUSDT'
    draft.fills.value[0]!.priceText = '1'
    draft.fills.value[0]!.quantityText = '1'
    draft.fills.value[0]!.filledAtText = ''

    await draft.save()

    expect(recordProxy.recordTrade.mock.calls[0]?.[0].firstEntryFill.filledAt).toBeNull()
  })

  it('止損放錯邊時原話寫在計畫止損旁，內容保留', async () => {
    recordProxy.recordTrade.mockRejectedValue(new TradeRejectedError(
      '做多的止損必須低於進場價', new TradeFormFieldVo('plannedStopLossPrice')))
    const draft = draftUnderTest()
    draft.symbol.value = 'BTCUSDT'
    draft.fills.value[0]!.priceText = '97905'
    draft.fills.value[0]!.quantityText = '0.03'
    draft.plannedStopLossText.value = '98000'

    const saved = await draft.save()

    expect(saved).toBeNull()
    expect(draft.fieldError('plannedStopLossPrice')).toBe('做多的止損必須低於進場價')
    expect(draft.fieldError('symbol')).toBeNull()
    expect(draft.plannedStopLossText.value).toBe('98000')
    expect(draft.saving.value).toBe(false)
  })

  it('缺合約標的時不送出，說出缺什麼', async () => {
    const draft = draftUnderTest()
    draft.fills.value[0]!.priceText = '1'
    draft.fills.value[0]!.quantityText = '1'

    await draft.save()

    expect(draft.rejectionMessage.value).toBe('請填合約標的')
    expect(draft.rejectedField.value).toBeNull()
    expect(recordProxy.recordTrade).not.toHaveBeenCalled()
  })

  it('同標的同方向已有持倉中時帶出那一筆', async () => {
    recordProxy.recordTrade.mockRejectedValue(new TradeAlreadyOpenError(
      'BTCUSDT 做多已有持倉中的 #27，請在那一筆加成交', 27))
    const draft = draftUnderTest()
    draft.symbol.value = 'BTCUSDT'
    draft.fills.value[0]!.priceText = '1'
    draft.fills.value[0]!.quantityText = '1'

    await draft.save()

    expect(draft.conflictingTradeId.value).toBe(27)
    expect(draft.rejectionMessage.value).toContain('#27')
    expect(draft.rejectedField.value).toBeNull()
  })

  it('後面的成交沒存成功時記得已建立的那一筆', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new TradeRejectedError('出場數量超過目前持倉', new TradeFormFieldVo('exitQuantity')))
    const draft = draftUnderTest()
    draft.symbol.value = 'BTCUSDT'
    draft.fills.value[0]!.priceText = '1'
    draft.fills.value[0]!.quantityText = '1'
    draft.addFill('exit')
    draft.fills.value[1]!.priceText = '1'
    draft.fills.value[1]!.quantityText = '5'

    await draft.save()

    expect(draft.recordedTradeId.value).toBe(27)
    expect(draft.fieldError('exitQuantity')).toContain('已建立 #27')
    expect(draft.fills.value.map(fill => fill.kind)).toEqual(['exit'])
  })

  it('對既有交易加到一半失敗時，已存下的那幾筆從表單移掉，再存不會重送', async () => {
    const existing = buildRecord({ status: 'open' }).toDomain().toDto()
    recordProxy.addFill.mockResolvedValueOnce(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValueOnce(new TradeRejectedError('出場數量超過目前持倉', new TradeFormFieldVo('exitQuantity')))
    const draft = draftUnderTest(existing)
    draft.fills.value[0]!.priceText = '98000'
    draft.fills.value[0]!.quantityText = '0.01'
    draft.addFill('exit')
    draft.fills.value[1]!.priceText = '99000'
    draft.fills.value[1]!.quantityText = '5'

    await draft.save()

    expect(draft.fieldError('exitQuantity')).toContain('前 1 筆已存下')
    expect(draft.fills.value).toHaveLength(1)
    expect(draft.fills.value[0]).toMatchObject({ kind: 'exit', quantityText: '5' })
  })

  it('儲存中再按一次不會送兩次', async () => {
    recordProxy.recordTrade.mockReturnValue(new Promise(() => {}))
    const draft = draftUnderTest()
    draft.symbol.value = 'BTCUSDT'
    draft.fills.value[0]!.priceText = '1'
    draft.fills.value[0]!.quantityText = '1'

    void draft.save()
    const second = await draft.save()

    expect(second).toBeNull()
    expect(recordProxy.recordTrade).toHaveBeenCalledTimes(1)
  })

  it('就地新增型態標籤並貼上；重名時原話呈現', async () => {
    tagProxy.createTag.mockResolvedValueOnce(new TradeTag(6, 'setup', '回踩'))
    tagProxy.createTag.mockRejectedValueOnce(new (await import('~/domain/errors/trade-tag-name-conflict-error')).TradeTagNameConflictError('已有同名的型態標籤'))
    const draft = draftUnderTest()

    await draft.createSetupTag('回踩')
    await draft.createSetupTag('回踩')

    expect(draft.setupTagIds.value).toEqual([6])
    expect(draft.setupTags.value.map(tag => tag.name)).toEqual(['回踩'])
    expect(draft.rejectionMessage.value).toBe('已有同名的型態標籤')
  })
})

describe('useContractTradeDraft：從連結打開', () => {
  it('預填那一輪的建議，看得出哪些是預填的', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill())
    const draft = draftUnderTest()

    const loaded = await draft.applyJournalLink('link-412')

    expect(loaded?.sourceLabel).toBe('來自 BTC 趨勢跟隨・第 412 輪')
    expect(draft.symbol.value).toBe('BTCUSDT')
    expect(draft.plannedStopLossText.value).toBe('96380')
    expect(draft.tradingStrategyId.value).toBe(5)
    expect(draft.fills.value[0]).toMatchObject({ priceText: '97850', quantityText: '0.051' })
    expect([...draft.prefilledFields.value]).toEqual(expect.arrayContaining([
      'symbol', 'direction', 'leverage', 'plannedStopLossPrice', 'plannedTakeProfitPrice', 'tradingStrategy', 'fillPrice', 'fillQuantity',
    ]))
    expect(draft.dirty.value).toBe(false)
    expect(draft.prefillLoading.value).toBe(false)
  })

  it('改成實際成交後那兩格不再算預填，儲存時帶著連結', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill())
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    const draft = draftUnderTest()
    await draft.applyJournalLink('link-412')

    draft.fills.value[0]!.priceText = '97905'
    draft.fills.value[0]!.quantityText = '0.030'
    await draft.save()

    expect(draft.prefilledFields.value.has('fillPrice')).toBe(false)
    expect(draft.prefilledFields.value.has('fillQuantity')).toBe(false)
    expect(recordProxy.recordTrade.mock.calls[0]?.[0].journalLinkIdentifier).toBe('link-412')
  })

  it('舊的一輪沒有參考價時進場價與數量留白並說明', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill({ referencePrice: null, plannedStopLossPrice: null, plannedTakeProfitPrice: null }))
    const draft = draftUnderTest()

    await draft.applyJournalLink('link-412')

    expect(draft.fills.value[0]).toMatchObject({ priceText: '', quantityText: '' })
    expect(draft.plannedStopLossText.value).toBe('')
    expect(draft.prefillMessage.value).toBe('這一輪沒有記下參考價，請手動填寫進場價與數量')
  })

  it('那一輪不在紀錄中或是別人的，空白表單並說明', async () => {
    recordProxy.findJournalLink.mockRejectedValue(new JournalLinkNotFoundError('找不到這一輪'))
    const draft = draftUnderTest()

    const loaded = await draft.applyJournalLink('link-412')

    expect(loaded).toBeNull()
    expect(draft.symbol.value).toBe('')
    expect(draft.prefillMessage.value).toContain('找不到這一輪')
    expect(draft.prefillMessage.value).toContain('這一輪的建議已不在紀錄中，請手動填寫')
    expect(draft.prefillNotFound.value).toBe(true)
    expect(draft.prefillFailed.value).toBe(false)
  })

  it('連不上時說連不上，而且標示讀取失敗', async () => {
    recordProxy.findJournalLink.mockRejectedValue(new BackendUnreachableError('http://x'))
    const draft = draftUnderTest()

    await draft.applyJournalLink('link-412')

    expect(draft.prefillFailed.value).toBe(true)
    expect(draft.prefillNotFound.value).toBe(false)
    expect(draft.prefillMessage.value).toContain('連不上交易服務')
  })

  it('讀取預填中不能儲存', async () => {
    recordProxy.findJournalLink.mockReturnValue(new Promise(() => {}))
    const draft = draftUnderTest()

    void draft.applyJournalLink('link-412')

    expect(draft.prefillLoading.value).toBe(true)
    expect(await draft.save()).toBeNull()
    expect(recordProxy.recordTrade).not.toHaveBeenCalled()
  })
})

describe('useContractTradeDraft：對既有交易加成交', () => {
  it('連結帶出的是加一筆進場成交，不改既有交易的其他欄位', async () => {
    const existing = buildRecord({ status: 'open' }).toDomain().toDto()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ mode: 'addEntryFill', targetTradeId: 27 }))
    recordProxy.addFill.mockResolvedValue(buildRecord({ status: 'open' }))
    const draft = draftUnderTest(existing)

    await draft.applyJournalLink('link-412')
    await draft.save()

    expect(draft.symbol.value).toBe('')
    expect(draft.fills.value[0]).toMatchObject({ priceText: '97850', quantityText: '0.051' })
    expect(recordProxy.addFill).toHaveBeenCalledWith(27, expect.objectContaining({ kind: 'entry' }))
    expect(recordProxy.recordTrade).not.toHaveBeenCalled()
  })

  it('預覽連同既有成交一起算', () => {
    const existing = buildRecord({ status: 'open', fills: [buildRecord().fills[1]] }).toDomain().toDto()
    const draft = draftUnderTest(existing)
    draft.fills.value[0]!.kind = 'exit'
    draft.fills.value[0]!.priceText = '100000'
    draft.fills.value[0]!.quantityText = '0.010'

    expect(draft.preview.value.positionText).toBe('0.02')
  })
})
