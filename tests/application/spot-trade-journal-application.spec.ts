import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import { SpotTradeJournalService } from '~/domain/service/spot-trade-journal-service'
import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { SpotTradeRecordPage } from '~/domain/models/entities/spot-trade-record-page'
import { SpotTradePrefill } from '~/domain/models/entities/spot-trade-prefill'
import { SpotTradeLiveComparison } from '~/domain/models/entities/spot-trade-live-comparison'
import { SpotTradeLiveComparisonRow } from '~/domain/models/entities/spot-trade-live-comparison-row'
import { SpotTradePerformance } from '~/domain/models/entities/spot-trade-performance'
import { SpotTradeCumulativePoint } from '~/domain/models/entities/spot-trade-cumulative-point'
import { SpotTradeDistributionBucket } from '~/domain/models/entities/spot-trade-distribution-bucket'
import { SpotTradeMistakeCost } from '~/domain/models/entities/spot-trade-mistake-cost'
import { SpotTradeFill } from '~/domain/models/entities/spot-trade-fill'
import { SpotTradeSourceGroup } from '~/domain/models/entities/spot-trade-source-group'
import { TradeNote } from '~/domain/models/entities/trade-note'
import { TradeReview } from '~/domain/models/entities/trade-review'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleSeriesVo } from '~/domain/models/vo/k-candle-series-vo'
import { SpotTradeListFilterDto } from '~/domain/models/dto/spot-trade-list-filter-dto'
import { SpotTradeDraftDto } from '~/domain/models/dto/spot-trade-draft-dto'
import { SpotTradeDraftFillDto } from '~/domain/models/dto/spot-trade-draft-fill-dto'
import { SpotTradeFillAmendmentDto } from '~/domain/models/dto/spot-trade-fill-amendment-dto'
import { TradePlanInputDto } from '~/domain/models/dto/trade-plan-input-dto'
import { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import { TradeRecordNotFoundError } from '~/domain/errors/trade-record-not-found-error'
import {
  buildSpotRecord,
  closedSpotOutcome,
  kCandleProxyMock,
  linkedSource,
  spotMarketStatistics,
  spotStatistics,
  spotTradeRecordProxyMock,
} from '../fixtures/spot-trade-journal'
import { measured, tradingStrategyProxyMock, unavailable } from '../fixtures/contract-trade-journal'

function setup() {
  const recordProxy = spotTradeRecordProxyMock()
  const tradingStrategyProxy = tradingStrategyProxyMock()
  const kCandleProxy = kCandleProxyMock()
  const application = new SpotTradeJournalApplication(
    new SpotTradeJournalService(
      recordProxy as unknown as ISpotTradeRecordProxy,
      tradingStrategyProxy as unknown as ITradingStrategyProxy,
      kCandleProxy as unknown as IKCandleProxy,
    ))

  return { application, recordProxy, tradingStrategyProxy, kCandleProxy }
}

function draft(overrides: Partial<Record<keyof SpotTradeDraftDto, unknown>> = {}): SpotTradeDraftDto {
  const base = {
    symbol: '2330',
    market: null,
    fills: [draftFill()],
    plannedStopLossText: '',
    plannedTakeProfitText: '',
    entryReason: '',
    confidence: null,
    tradingStrategyId: null,
    setupTagIds: [],
    journalLinkIdentifier: null,
    referencePrice: null,
    ...overrides,
  } as Record<keyof SpotTradeDraftDto, never>

  return new SpotTradeDraftDto(
    base.symbol,
    base.market,
    base.fills,
    base.plannedStopLossText,
    base.plannedTakeProfitText,
    base.entryReason,
    base.confidence,
    base.tradingStrategyId,
    base.setupTagIds,
    base.journalLinkIdentifier,
    base.referencePrice,
  )
}

function draftFill(overrides: Partial<Record<keyof SpotTradeDraftFillDto, unknown>> = {}): SpotTradeDraftFillDto {
  const base = { kind: 'buy', filledAt: null, priceText: '1050', quantityText: '1000', feeText: '', ...overrides } as Record<keyof SpotTradeDraftFillDto, never>

  return new SpotTradeDraftFillDto(base.kind, base.filledAt, base.priceText, base.quantityText, base.feeText)
}

function prefill(overrides: Partial<Record<keyof SpotTradePrefill, unknown>> = {}): SpotTradePrefill {
  const base = {
    journalLinkIdentifier: 'link-88',
    mode: 'newTrade',
    targetTradeId: null,
    strategyBotName: '台積電趨勢',
    runNumber: 88,
    ranAt: new Date('2026-09-27T01:30:00Z'),
    signal: 'buy',
    symbol: '2330',
    market: 'taiwanStock',
    referencePrice: new Decimal('1050'),
    quantity: new Decimal('100'),
    plannedStopLossPrice: new Decimal('1000'),
    plannedTakeProfitPrice: new Decimal('1150'),
    tradingStrategyId: 7,
    ...overrides,
  } as Record<keyof SpotTradePrefill, never>

  return new SpotTradePrefill(
    base.journalLinkIdentifier,
    base.mode,
    base.targetTradeId,
    base.strategyBotName,
    base.runNumber,
    base.ranAt,
    base.signal,
    base.symbol,
    base.market,
    base.referencePrice,
    base.quantity,
    base.plannedStopLossPrice,
    base.plannedTakeProfitPrice,
    base.tradingStrategyId,
  )
}

describe('SpotTradeJournalApplication.getTrade', () => {
  it('平倉後的結果：淨損益、報酬率、R，市場台股以新台幣計', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord())

    const record = await application.getTrade(5)

    expect(record.outcome.figureLabelled('淨損益')).toMatchObject({ text: '+67,900.00', tone: 'success' })
    expect(record.outcome.figureLabelled('報酬率')).toMatchObject({ text: '+6.47%', tone: 'success' })
    expect(record.outcome.figureLabelled('R 倍數')?.text).toBe('+1.36R')
    expect(record).toMatchObject({ marketLabel: '台股', currency: 'TWD', wholeSharesOnly: true, statusLabel: '已平倉' })
    expect(record.fills.map(fill => fill.kindLabel)).toEqual(['買進', '賣出'])
    expect(record.holdingDurationText).toBe('持有 2 天 2 小時')
  })

  it('沒有計畫止損時報酬率照算，R 寫未設止損', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({
      plannedStopLossPrice: null,
      outcome: closedSpotOutcome({ plannedRisk: unavailable('noStopLoss'), rMultiple: unavailable('noStopLoss') }),
    }))

    const record = await application.getTrade(5)

    expect(record.outcome.figureLabelled('報酬率')?.text).toBe('+6.47%')
    expect(record.outcome.figureLabelled('R 倍數')?.text).toBe('未設止損，算不出')
    expect(record.plannedStopLossText).toBe('未設定')
  })

  it('持有中：以最新價估浮動損益，沒有資金費用與預估強平價', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({
      status: 'open',
      closedAt: null,
      outcome: closedSpotOutcome({ holding: new Decimal('600'), floatingProfit: measured('18000') }),
    }))

    const record = await application.getTrade(5)

    expect(record.outcome.figureLabelled('浮動損益')).toMatchObject({ text: '+18,000.00', note: '估算' })
    expect(record.outcome.figureLabelled('已實現淨損益')).toBeDefined()
    expect(record.outcome.figureLabelled('資金費用')).toBeUndefined()
    expect(record.outcome.figureLabelled('預估強平價')).toBeUndefined()
    expect(record).toMatchObject({ statusLabel: '持有中', planLocked: false, canEditFills: true, canWriteReview: false, holdingText: '600 股' })
    expect(record.reviewUnavailableMessage).toBe('平倉後才能檢討')
  })

  it('沒有行情時最大不利與最大有利寫原因，價格路徑同一句', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({
      outcome: closedSpotOutcome({
        maximumAdverseExcursion: unavailable('noMarketData'),
        maximumFavorableExcursion: unavailable('noMarketData'),
        profitCaptureRate: unavailable('noMarketData'),
      }),
    }))

    const record = await application.getTrade(5)

    expect(record.outcome.figureLabelled('最大不利')?.text).toBe('沒有行情資料，無法計算')
    expect(record.outcome.pricePathUnavailableMessage).toBe('沒有行情資料，無法計算')
  })

  it('來自機器人連結的交易有來源與進場滑點；加密現貨不標股數', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({
      market: 'crypto',
      currency: 'USDT',
      source: linkedSource(),
      outcome: closedSpotOutcome({ entrySlippagePercentage: measured('0.19') }),
    }))

    const record = await application.getTrade(5)

    expect(record.source?.label).toBe('來自 台積電趨勢・第 88 輪')
    expect(record.originLabel).toBe('來自 台積電趨勢・第 88 輪')
    expect(record.outcome.figureLabelled('進場滑點')).toMatchObject({ text: '0.19%', tone: 'danger' })
    expect(record).toMatchObject({ marketLabel: '加密貨幣', wholeSharesOnly: false, holdingText: '0' })
  })

  it('找不到的交易原樣帶回', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockRejectedValue(new TradeRecordNotFoundError('找不到這筆交易'))

    await expect(application.getTrade(9)).rejects.toBeInstanceOf(TradeRecordNotFoundError)
  })
})

describe('SpotTradeJournalApplication.listTrades', () => {
  function withTrades() {
    const context = setup()
    context.recordProxy.listTrades.mockResolvedValue(new SpotTradeRecordPage([
      buildSpotRecord(),
      buildSpotRecord({ id: 6, symbol: 'BTCUSDT', market: 'crypto', currency: 'USDT', status: 'open', closedAt: null, tradingStrategyId: 7, tradingStrategyName: 'BTC 現貨', outcome: closedSpotOutcome({ floatingProfit: measured('-12.5'), averageSellPrice: null }) }),
    ], 2))
    context.recordProxy.findStatistics.mockResolvedValue(spotStatistics())

    return context
  }

  it('摘要依市場分組，沒有平倉的市場不列；計數與待檢討', async () => {
    const { application } = withTrades()

    const list = await application.listTrades(new SpotTradeListFilterDto())

    expect(list.marketSummaries.map(summary => summary.marketLabel)).toEqual(['台股'])
    expect(list.marketSummaries[0]?.figures[0]).toMatchObject({ label: '淨損益', text: '+120,000.00', note: 'TWD，已扣手續費' })
    expect(list.tradeCountsLabel).toBe('已平倉 10 筆・持有中 1 筆')
    expect(list.pendingReviewCount).toBe(1)
    expect(list.symbolOptions).toEqual(['2330', 'BTCUSDT'])
  })

  it('每一列：市場、來源、買進賣出均價、持有中標浮與報酬率不適用', async () => {
    const { application } = withTrades()

    const list = await application.listTrades(new SpotTradeListFilterDto())

    expect(list.rows[0]).toMatchObject({ marketLabel: '台股', sourceLabel: '自行判斷', averageBuyPriceText: '1,050', averageSellPriceText: '1,120' })
    expect(list.rows[0]?.returnRate.text).toBe('+6.47%')
    expect(list.rows[1]).toMatchObject({ marketLabel: '加密貨幣', sourceLabel: 'BTC 現貨', averageSellPriceText: '—', statusLabel: '持有中' })
    expect(list.rows[1]?.profit).toMatchObject({ text: '−12.50', note: '浮' })
    expect(list.rows[1]?.returnRate.text).toBe('—')
    expect(list.rows[0]?.tags[0]).toMatchObject({ name: '追價進場', tone: 'danger' })
  })

  it.each([
    ['市場', new SpotTradeListFilterDto('all', 'all', 'crypto'), [6]],
    ['狀態', new SpotTradeListFilterDto('closed'), [5]],
    ['來源', new SpotTradeListFilterDto('all', 'linked'), [6]],
    ['自行判斷', new SpotTradeListFilterDto('all', 'selfJudged'), [5]],
    ['標的', new SpotTradeListFilterDto('all', 'all', 'all', '2330'), [5]],
  ])('依%s篩選', async (_name, filter, expectedIds) => {
    const { application } = withTrades()

    expect((await application.listTrades(filter)).rows.map(row => row.id)).toEqual(expectedIds)
  })

  it('沒有交易與沒有符合篩選各說一句', async () => {
    const { application, recordProxy } = setup()
    recordProxy.listTrades.mockResolvedValue(new SpotTradeRecordPage([], 0))
    recordProxy.findStatistics.mockResolvedValue(spotStatistics())

    expect((await application.listTrades(new SpotTradeListFilterDto())).emptyMessage).toContain('還沒有任何現貨交易')

    recordProxy.listTrades.mockResolvedValue(new SpotTradeRecordPage([buildSpotRecord()], 1))
    expect((await application.listTrades(new SpotTradeListFilterDto('open'))).emptyMessage).toBe('沒有符合篩選的交易')
  })
})

describe('SpotTradeJournalApplication 記一筆', () => {
  it('即時預覽持有、買進均價、止損往下幾個百分點與計畫風險', () => {
    const { application } = setup()

    const preview = application.previewDraft(draft({
      fills: [draftFill(), draftFill({ kind: 'sell', priceText: '1100', quantityText: '400' })],
      plannedStopLossText: '1000',
      plannedTakeProfitText: '1150',
    }))

    expect(preview).toMatchObject({
      holdingText: '600',
      averageBuyPriceText: '1,050',
      stopLossDistanceText: '往下 4.76%',
      plannedRiskText: '50,000.00',
      takeProfitDistanceText: '往上 9.52%',
      missingFieldMessage: null,
      wholeSharesMessage: null,
    })
  })

  it('台股數量不是整數時提示，並擋下送出', async () => {
    const { application, recordProxy } = setup()
    const fractionalDraft = draft({ market: 'taiwanStock', fills: [draftFill({ quantityText: '1000.5' })] })

    expect(application.previewDraft(fractionalDraft).wholeSharesMessage).toBe('台股數量以股計，必須是整數')
    await expect(application.recordDraft(fractionalDraft)).rejects.toThrow('台股數量以股計，必須是整數')
    expect(recordProxy.recordTrade).not.toHaveBeenCalled()
  })

  it('加密現貨可以有小數', () => {
    const { application } = setup()

    expect(application.previewDraft(draft({ market: 'crypto', fills: [draftFill({ quantityText: '0.05' })] })).wholeSharesMessage).toBeNull()
  })

  it('從連結來的草稿算出比參考價高或低多少', () => {
    const { application } = setup()

    expect(application.previewDraft(draft({ referencePrice: new Decimal('1048') })).entrySlippageText).toBe('比參考價高 0.19%（滑點）')
    expect(application.previewDraft(draft({ referencePrice: new Decimal('1060') })).entrySlippageText).toBe('比參考價低 0.94%（滑點）')
  })

  it.each([
    ['沒有標的', { symbol: ' ' }, '請填標的'],
    ['價格讀不懂', { fills: [draftFill({ priceText: 'abc' })] }, '第 1 筆的價格與數量要填大於零的數字'],
    ['只有賣出', { fills: [draftFill({ kind: 'sell' })] }, '至少要有一筆填好買進價與數量的買進'],
  ])('%s時說出缺什麼', (_name, overrides, message) => {
    const { application } = setup()

    expect(application.previewDraft(draft(overrides)).missingFieldMessage).toBe(message)
  })

  it('第一筆買進隨新增送出，其餘依序加上；標的轉大寫、手續費留白不送', async () => {
    const { application, recordProxy } = setup()
    recordProxy.recordTrade.mockResolvedValue(buildSpotRecord({ status: 'open' }))
    recordProxy.addFill.mockResolvedValue(buildSpotRecord())

    const saved = await application.recordDraft(draft({
      symbol: 'btcusdt',
      fills: [draftFill(), draftFill({ kind: 'sell', priceText: '1120', feeText: '1983' })],
      plannedStopLossText: '1000',
      tradingStrategyId: 7,
      setupTagIds: [4],
      journalLinkIdentifier: 'link-88',
    }))

    const writeDto = recordProxy.recordTrade.mock.calls[0]?.[0]
    expect(writeDto).toMatchObject({ symbol: 'BTCUSDT', tradingStrategyId: 7, setupTagIds: [4], journalLinkIdentifier: 'link-88' })
    expect(writeDto.firstBuyFill).toMatchObject({ kind: 'buy', fee: null })
    expect(writeDto.plannedStopLossPrice.toString()).toBe('1000')
    expect(recordProxy.addFill.mock.calls[0]?.[1]).toMatchObject({ kind: 'sell' })
    expect(recordProxy.addFill.mock.calls[0]?.[1].fee.toString()).toBe('1983')
    expect(saved.statusLabel).toBe('已平倉')
  })

  it('後面的賣出被拒時說已建立哪一筆、第幾筆沒存成功', async () => {
    const { application, recordProxy } = setup()
    recordProxy.recordTrade.mockResolvedValue(buildSpotRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new TradeRejectedError('賣出超過持有 1000', new TradeFormFieldVo('exitQuantity')))

    const failure = await application.recordDraft(draft({ fills: [draftFill(), draftFill({ kind: 'sell', quantityText: '1500' })] })).catch(error => error)

    expect((failure as TradeRejectedError).message).toBe('已建立 #5，但第 2 筆沒有存成功：賣出超過持有 1000')
    expect((failure as TradeRejectedError).recordedTradeId).toBe(5)
  })

  it('對既有交易加賣出時連同既有的買進一起算', async () => {
    const { application, recordProxy } = setup()
    const existing = (buildSpotRecord({ status: 'open' })).toDomain().toDto()
    recordProxy.addFill.mockResolvedValue(buildSpotRecord())

    const preview = application.previewDraft(draft({ symbol: '', fills: [draftFill({ kind: 'sell', quantityText: '600' })] }), existing.fills)
    await application.addDraftFills(5, draft({ symbol: '', fills: [draftFill({ kind: 'sell', quantityText: '600' })] }), existing.fills)

    expect(preview.missingFieldMessage).toBeNull()
    expect(preview.holdingText).toBe('-600')
    expect(recordProxy.addFill.mock.calls[0]?.[0]).toBe(5)
  })

  it('預填欄位只有還等於預填值的才算', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findJournalLink.mockResolvedValue(prefill())
    const loadedPrefill = await application.openJournalLink('link-88')

    const fields = application.prefilledDraftFields(draft({
      fills: [draftFill({ priceText: '1050', quantityText: '120' })],
      plannedStopLossText: '1000',
      plannedTakeProfitText: '1160',
      tradingStrategyId: 7,
    }), loadedPrefill)

    expect(fields).toEqual(['symbol', 'plannedStopLossPrice', 'tradingStrategy', 'fillPrice'])
  })

  it('改過內容才算有變動', () => {
    const { application } = setup()

    expect(application.draftDiffers(draft(), draft())).toBe(false)
    expect(application.draftDiffers(draft({ entryReason: '回檔' }), draft())).toBe(true)
  })
})

describe('SpotTradeJournalApplication 其餘寫入', () => {
  it('修正一筆：讀不懂的價量不送出', async () => {
    const { application, recordProxy } = setup()
    const fill = buildSpotRecord().toDomain().toDto().fills[0]!

    const failure = await application.amendFill(5, new SpotTradeFillAmendmentDto(fill, 'abc', '1', '')).catch(error => error)

    expect((failure as TradeRejectedError).message).toBe('價格與數量要填數字')
    expect(recordProxy.amendFill).not.toHaveBeenCalled()
  })

  it('修正一筆、刪除一筆、改計畫、加附註、寫檢討、貼標籤、刪除交易都交給交易服務', async () => {
    const { application, recordProxy } = setup()
    const record = buildSpotRecord()
    for (const method of ['amendFill', 'removeFill', 'amendPlan', 'addNote', 'writeReview', 'assignSetupTags'] as const) {
      recordProxy[method].mockResolvedValue(record)
    }
    const fill = record.toDomain().toDto().fills[0]!

    await application.amendFill(5, new SpotTradeFillAmendmentDto(fill, '1051', '1000', '120'))
    await application.removeFill(5, 2)
    await application.amendPlan(5, new TradePlanInputDto('1000', '', '回檔', 4))
    await application.addNote(5, '  止損打錯  ')
    await application.writeReview(5, new TradeReviewWriteDto('照計畫', '', '', 4, [3]))
    await application.assignSetupTags(5, [4])
    await application.deleteTrade(5)

    expect(recordProxy.amendFill.mock.calls[0]?.[2]).toMatchObject({ kind: 'buy' })
    expect(recordProxy.amendFill.mock.calls[0]?.[2].fee.toString()).toBe('120')
    expect(recordProxy.removeFill).toHaveBeenCalledWith(5, 2)
    expect(recordProxy.amendPlan.mock.calls[0]?.[1]).toMatchObject({ plannedTakeProfitPrice: null, entryReason: '回檔', confidence: 4 })
    expect(recordProxy.addNote).toHaveBeenCalledWith(5, '止損打錯')
    expect(recordProxy.assignSetupTags).toHaveBeenCalledWith(5, [4])
    expect(recordProxy.deleteTrade).toHaveBeenCalledWith(5)
  })
})

describe('SpotTradeJournalApplication.openJournalLink', () => {
  it('買入且沒有持有中：新增一筆，說明來源與參考價', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findJournalLink.mockResolvedValue(prefill())

    const loaded = await application.openJournalLink('link-88')

    expect(loaded).toMatchObject({ mode: 'newTrade', targetPath: null, sourceLabel: '來自 台積電趨勢・第 88 輪', referencePriceText: '1,050', signalLabel: '買入', notice: null })
    expect(loaded.quantity?.toString()).toBe('100')
  })

  it('買入但已有持有中：改成那一筆的加一筆買進', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ mode: 'addBuyFill', targetTradeId: 5 }))

    const loaded = await application.openJournalLink('link-88')

    expect(loaded).toMatchObject({ mode: 'addBuyFill', targetTradeId: 5, targetPath: '/spot-trade-journal/5?addFill=buy' })
    expect(loaded.notice).toBe('2330 已有持有中的 #5，這一輪記成加碼買進')
  })

  it('出場且有持有中：打開那一筆的加一筆賣出，數量是全部持有', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ mode: 'addSellFill', signal: 'sell', targetTradeId: 5, quantity: new Decimal('600') }))

    const loaded = await application.openJournalLink('link-88')

    expect(loaded).toMatchObject({ mode: 'addSellFill', targetPath: '/spot-trade-journal/5?addFill=sell', signalLabel: '出場', signalTone: 'info' })
    expect(loaded.quantity?.toString()).toBe('600')
    expect(loaded.notice).toBe('2330 持有中的 #5，這一輪記成賣出')
  })

  it('出場但沒有持有中：說明沒有，並提供新增', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ mode: 'noOpenHolding', signal: 'sell' }))

    const loaded = await application.openJournalLink('link-88')

    expect(loaded).toMatchObject({ mode: 'noOpenHolding', targetPath: null })
    expect(loaded.notice).toContain('沒有持有中的 2330')
  })

  it('沒有建議部位時數量留空；那一輪沒記參考價時價格與數量都留空並說明', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ quantity: null }))
    expect((await application.openJournalLink('link-88')).quantity).toBeNull()

    recordProxy.findJournalLink.mockResolvedValue(prefill({ referencePrice: null }))
    const withoutReference = await application.openJournalLink('link-88')
    expect(withoutReference).toMatchObject({ price: null, quantity: null, referencePriceText: null })
    expect(withoutReference.notice).toBe('這一輪沒有記下參考價，請手動填寫價格與數量')
  })
})

describe('SpotTradeJournalApplication.getStatistics', () => {
  it('台股與加密貨幣兩組分開，平均 R 標示以幾筆計', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findStatistics.mockResolvedValue(spotStatistics([
      spotMarketStatistics({
        cumulativeProfit: [new SpotTradeCumulativePoint(new Date('2026-09-10T00:00:00Z'), new Decimal('120000'))],
        returnDistribution: [new SpotTradeDistributionBucket('-5%~0%', 2, false), new SpotTradeDistributionBucket('0%~5%', 4, true)],
        mistakeCosts: [new SpotTradeMistakeCost('追價進場', 2, new Decimal('-30000'), -0.028)],
        averageEntrySlippagePercentage: new Decimal('0.12'),
        entrySlippageTradeCount: 2,
      }),
      spotMarketStatistics({ market: 'crypto', currency: 'USDT', closedTradeCount: 6, winCount: 3, winRate: 0.5, netProfit: new Decimal('-40'), rTradeCount: 6, averageRMultiple: null }),
    ]))

    const statistics = await application.getStatistics('30d')
    const [taiwanStock, crypto] = statistics.markets

    expect(statistics.markets.map(market => market.marketLabel)).toEqual(['台股', '加密貨幣'])
    expect(taiwanStock?.figures.map(figure => [figure.label, figure.text])).toEqual([
      ['淨損益', '+120,000.00'],
      ['勝率', '60%'],
      ['平均報酬率', '+3.12%'],
      ['獲利因子', '1.80'],
      ['平均 R', '+0.90R'],
      ['平均進場滑點', '0.12%'],
    ])
    expect(taiwanStock?.rMultipleNote).toBe('平均 R 以 3 筆計（有計畫止損的交易）')
    expect(taiwanStock?.totalProfit?.text).toBe('+120,000.00')
    expect(taiwanStock?.distribution.map(bar => [bar.label, bar.tone, bar.widthPercentage])).toEqual([['-5%~0%', 'danger', 50], ['0%~5%', 'success', 100]])
    expect(taiwanStock?.mistakeCosts[0]).toMatchObject({ tagName: '追價進場', totalNetProfitText: '−30,000.00', averageReturnRateText: '−2.80%', widthPercentage: 100 })
    expect(taiwanStock?.sourceComparison.map(row => [row.label, row.winRateText, row.averageReturnRateText])).toEqual([['有關聯策略', '75%', '+5.00%'], ['自行判斷', '50%', '不適用']])
    expect(crypto?.figures.find(figure => figure.label === '淨損益')?.note).toBe('USDT，已扣手續費')
    expect(crypto?.rMultipleNote).toBeNull()
    expect(crypto?.figures.find(figure => figure.label === '平均 R')?.text).toBe('不適用')
  })

  it('某一組沒有平倉：說這段期間沒有已平倉交易', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findStatistics.mockResolvedValue(spotStatistics())

    const crypto = (await application.getStatistics('7d')).markets[1]

    expect(crypto).toMatchObject({ emptyMessage: '這段期間沒有已平倉交易', figures: [] })
  })

  it('期間選項沿用 7／30／90 天與全部', () => {
    const { application } = setup()

    expect(application.listStatisticsPeriods().map(option => option.value)).toEqual(['7d', '30d', '90d', 'all'])
  })
})

describe('SpotTradeJournalApplication.getLiveComparison', () => {
  it('並排勝率與筆數，低於回測時標出差距，說明重演不計成本', async () => {
    const { application, tradingStrategyProxy } = setup()
    tradingStrategyProxy.findSpotTradeComparison.mockResolvedValue(new SpotTradeLiveComparison('台股均線', false, [
      new SpotTradeLiveComparisonRow('2330', 'taiwanStock', new SpotTradePerformance(8, 0.5, new Decimal('0.1'), 2), new SpotTradePerformance(12, 0.62, null, 0), null),
      new SpotTradeLiveComparisonRow('2317', 'taiwanStock', new SpotTradePerformance(3, 0.67, null, 0), null, '行情不夠'),
    ], new Decimal('0.1'), 2))

    const comparison = await application.getLiveComparison(7)

    expect(comparison.costNote).toBe('現貨不設手續費率，重演不計成本')
    expect(comparison.strategyEntrySlippageText).toBe('整份策略平均進場滑點 0.10%，以 2 筆計')
    expect(comparison.rows[0]).toMatchObject({ marketLabel: '台股', verdictLabel: '比回測低 12 個百分點', verdictTone: 'danger', liveWinRateTone: 'danger' })
    expect(comparison.rows[0]?.live).toMatchObject({ winRateText: '50%', entrySlippageText: '0.10%', entrySlippageNote: '以 2 筆計' })
    expect(comparison.rows[1]).toMatchObject({ backtest: null, backtestUnavailableMessage: '行情不夠，無法重演', verdictLabel: '無法比較' })
  })

  it('策略已刪除或沒有已平倉實單時說明', async () => {
    const { application, tradingStrategyProxy } = setup()
    tradingStrategyProxy.findSpotTradeComparison.mockResolvedValue(new SpotTradeLiveComparison('', true, [], null, 0))
    expect((await application.getLiveComparison(7)).notice).toBe('交易策略已刪除，無法重演')

    tradingStrategyProxy.findSpotTradeComparison.mockResolvedValue(new SpotTradeLiveComparison('台股均線', false, [], null, 0))
    const empty = await application.getLiveComparison(7)
    expect(empty).toMatchObject({ notice: '還沒有已平倉的實單可以對照', strategyEntrySlippageText: null })
  })
})

describe('SpotTradeJournalApplication.getPricePath', () => {
  it('取持有前後的現貨行情，標出每筆買賣與計畫線', async () => {
    const { application, kCandleProxy } = setup()
    const record = buildSpotRecord({ plannedTakeProfitPrice: new Decimal('1150') }).toDomain().toDto()
    kCandleProxy.findKCandleSeries.mockResolvedValue(new KCandleSeriesVo([
      new KCandle('2330', new Date('2026-09-01T01:00:00Z'), new Decimal('1050'), new Decimal('1060'), new Decimal('1040'), new Decimal('1055'), new Decimal('10'), null, null, null),
    ], null as never))

    const pricePath = await application.getPricePath(record)

    expect(kCandleProxy.findKCandleSeries.mock.calls[0]?.[0].symbol).toBe('2330')
    expect(pricePath.markers.map(marker => [marker.kind, marker.text])).toEqual([['entry', '買進 1,050'], ['exit', '賣出 1,120']])
    expect(pricePath.lines.map(line => line.label)).toEqual(['買進均價', '計畫止損', '計畫止盈', '最大不利', '最大有利'])
  })

  it('沒有行情時說沒有行情資料', async () => {
    const { application, kCandleProxy } = setup()
    kCandleProxy.findKCandleSeries.mockResolvedValue(new KCandleSeriesVo([], null as never))

    expect((await application.getPricePath(buildSpotRecord({ status: 'open', closedAt: null }).toDomain().toDto())).emptyMessage).toBe('沒有行情資料，無法計算')
  })
})

describe('SpotTradeJournalApplication.describeFailure', () => {
  it('拒絕原話帶回', () => {
    const { application } = setup()

    expect(application.describeFailure(new TradeRejectedError('賣出超過持有', null)).message).toBe('賣出超過持有')
  })
})

describe('SpotTradeFill 排序', () => {
  it('買賣依時間由早到晚', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({
      fills: [
        new SpotTradeFill(3, 'buy', new Date('2026-09-02T00:00:00Z'), new Decimal('1060'), new Decimal('500'), new Decimal('0')),
        new SpotTradeFill(1, 'buy', new Date('2026-09-01T00:00:00Z'), new Decimal('1050'), new Decimal('500'), new Decimal('0')),
      ],
    }))

    expect((await application.getTrade(5)).fills.map(fill => fill.id)).toEqual([1, 3])
  })
})

describe('SpotTradeJournalApplication 邊界', () => {
  it('附註依時間排列；沒有極值價位時不附價位；滑點對交易有利時不是下跌色', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({
      source: linkedSource(),
      notes: [new TradeNote(2, '後來', new Date('2026-09-05T00:00:00Z')), new TradeNote(1, '先', new Date('2026-09-04T00:00:00Z'))],
      outcome: closedSpotOutcome({ maximumAdversePrice: null, entrySlippagePercentage: measured('-0.05') }),
    }))

    const record = await application.getTrade(5)

    expect(record.notes.map(note => note.content)).toEqual(['先', '後來'])
    expect(record.review).toBeNull()

    recordProxy.findTrade.mockResolvedValue(buildSpotRecord({ status: 'reviewed', review: new TradeReview('照計畫', '', '', 4, new Date()) }))
    expect((await application.getTrade(5)).review).toMatchObject({ wentWell: '照計畫', executionScore: 4 })
    expect(record.outcome.figureLabelled('最大不利')?.note).toBeNull()
    expect(record.outcome.figureLabelled('進場滑點')).toMatchObject({ text: '−0.05%', tone: 'neutral' })
  })

  it('列表：來自連結的列寫機器人與輪次；報酬率算不出時寫原因；認不得的市場照原樣寫', async () => {
    const { application, recordProxy } = setup()
    recordProxy.listTrades.mockResolvedValue(new SpotTradeRecordPage([
      buildSpotRecord({ source: linkedSource(), outcome: closedSpotOutcome({ returnRate: unavailable('notApplicable') }) }),
      buildSpotRecord({ id: 7, market: 'futures', tags: [new TradeTag(4, 'setup', '回踩')] }),
    ], 2))
    recordProxy.findStatistics.mockResolvedValue(spotStatistics())

    const list = await application.listTrades(new SpotTradeListFilterDto())

    expect(list.rows[0]).toMatchObject({ sourceLabel: '台積電趨勢 #88' })
    expect(list.rows[0]?.returnRate.text).toBe('不適用')
    expect(list.rows[1]?.marketLabel).toBe('futures')
    expect(list.rows[1]?.tags[0]).toMatchObject({ name: '回踩', tone: 'neutral' })
  })

  it('統計：沒有虧損與沒有報酬率時不適用；失誤全是零時橫條不畫', async () => {
    const { application, recordProxy } = setup()
    recordProxy.findStatistics.mockResolvedValue(spotStatistics([spotMarketStatistics({
      profitFactor: null,
      averageReturnRate: null,
      mistakeCosts: [new SpotTradeMistakeCost('報復性交易', 1, new Decimal('0'), null)],
      linkedGroup: new SpotTradeSourceGroup(0, null, null),
    })]))

    const taiwanStock = (await application.getStatistics('30d')).markets[0]

    expect(taiwanStock?.figures.find(figure => figure.label === '獲利因子')?.text).toBe('不適用')
    expect(taiwanStock?.figures.find(figure => figure.label === '平均報酬率')?.text).toBe('不適用')
    expect(taiwanStock?.figures.find(figure => figure.label === '平均進場滑點')?.text).toBe('沒有來自機器人連結的交易')
    expect(taiwanStock?.mistakeCosts[0]).toMatchObject({ widthPercentage: 0, averageReturnRateText: '不適用' })
    expect(taiwanStock?.sourceComparison[0]).toMatchObject({ winRateText: '不適用', averageReturnRateText: '不適用' })
  })

  it('對照：不低於回測、重演沒說原因、策略已刪除時每一列都說無法重演', async () => {
    const { application, tradingStrategyProxy } = setup()
    tradingStrategyProxy.findSpotTradeComparison.mockResolvedValue(new SpotTradeLiveComparison('台股均線', false, [
      new SpotTradeLiveComparisonRow('2330', 'taiwanStock', new SpotTradePerformance(8, 0.7, null, 0), new SpotTradePerformance(12, 0.6, null, 0), null),
      new SpotTradeLiveComparisonRow('2317', 'taiwanStock', new SpotTradePerformance(3, null, null, 0), null, null),
    ], null, 0))

    const comparison = await application.getLiveComparison(7)

    expect(comparison.strategyEntrySlippageText).toBe('整份策略平均進場滑點：不適用（沒有來自機器人連結的實單）')
    expect(comparison.rows[0]).toMatchObject({ verdictLabel: '不低於回測', verdictTone: 'success', liveWinRateTone: 'neutral' })
    expect(comparison.rows[0]?.live).toMatchObject({ entrySlippageText: '不適用', entrySlippageNote: null })
    expect(comparison.rows[1]).toMatchObject({ backtestUnavailableMessage: '重演沒有結果，無法重演' })
    expect(comparison.rows[1]?.live.winRateText).toBe('不適用')

    tradingStrategyProxy.findSpotTradeComparison.mockResolvedValue(new SpotTradeLiveComparison('', true, [
      new SpotTradeLiveComparisonRow('2330', 'taiwanStock', new SpotTradePerformance(8, 0.5, null, 0), null, '策略不在了'),
    ], null, 0))
    expect((await application.getLiveComparison(7)).rows[0]?.backtestUnavailableMessage).toBe('交易策略已刪除，無法重演')
  })

  it('記一筆時沒有標的就不送出；加一筆時一筆都沒填說出缺什麼', async () => {
    const { application, recordProxy } = setup()
    const existing = buildSpotRecord({ status: 'open' }).toDomain().toDto()

    await expect(application.recordDraft(draft({ symbol: '' }))).rejects.toThrow('請填標的')
    await expect(application.addDraftFills(5, draft({ symbol: '', fills: [] }), existing.fills)).rejects.toThrow('至少要有一筆填好價格與數量的買進或賣出')
    expect(recordProxy.recordTrade).not.toHaveBeenCalled()
    expect(recordProxy.addFill).not.toHaveBeenCalled()
  })

  it('後面的買賣遇到非規則的錯誤時原樣往上拋', async () => {
    const { application, recordProxy } = setup()
    recordProxy.recordTrade.mockResolvedValue(buildSpotRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new TradeRecordNotFoundError('找不到這筆交易'))

    await expect(application.recordDraft(draft({ fills: [draftFill(), draftFill({ kind: 'sell' })] }))).rejects.toBeInstanceOf(TradeRecordNotFoundError)
  })

  it('價格路徑：沒有計畫止損時不畫那條線', async () => {
    const { application, kCandleProxy } = setup()
    kCandleProxy.findKCandleSeries.mockResolvedValue(new KCandleSeriesVo([
      new KCandle('2330', new Date('2026-09-01T01:00:00Z'), new Decimal('1050'), new Decimal('1060'), new Decimal('1040'), new Decimal('1055'), new Decimal('10'), null, null, null),
    ], null as never))

    const pricePath = await application.getPricePath(buildSpotRecord({ plannedStopLossPrice: null }).toDomain().toDto())

    expect(pricePath.lines.map(line => line.label)).toEqual(['買進均價', '最大不利', '最大有利'])
  })
})
