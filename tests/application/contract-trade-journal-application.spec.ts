import Decimal from 'decimal.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import { ContractTradeListFilterDto } from '~/domain/models/dto/contract-trade-list-filter-dto'
import { ContractTradeDraftDto } from '~/domain/models/dto/contract-trade-draft-dto'
import { ContractTradeDraftFillDto } from '~/domain/models/dto/contract-trade-draft-fill-dto'
import type { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { TradePlanInputDto } from '~/domain/models/dto/trade-plan-input-dto'
import { ContractTradeFillAmendmentDto } from '~/domain/models/dto/contract-trade-fill-amendment-dto'
import { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { ContractTradeLiveComparison } from '~/domain/models/entities/contract-trade-live-comparison'
import { ContractTradeLiveComparisonRow } from '~/domain/models/entities/contract-trade-live-comparison-row'
import { ContractTradePerformance } from '~/domain/models/entities/contract-trade-performance'
import { ContractTradeCumulativePoint } from '~/domain/models/entities/contract-trade-cumulative-point'
import { ContractTradeDistributionBucket } from '~/domain/models/entities/contract-trade-distribution-bucket'
import { TradeSource } from '~/domain/models/entities/trade-source'
import { ContractTradeMistakeCost } from '~/domain/models/entities/contract-trade-mistake-cost'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import {
  buildPage,
  buildRecord,
  buildStatistics,
  buildSummary,
  closedOutcome,
  contractTradeRecordProxyMock,
  kCandleContractProxyMock,
  measured,
  takerFeeSetting,
  tradingStrategyProxyMock,
  unavailable,
  unconfiguredFeeSetting,
} from '../fixtures/contract-trade-journal'

function buildFixture() {
  const recordProxy = contractTradeRecordProxyMock()
  const tradingStrategyProxy = tradingStrategyProxyMock()
  const kCandleContractProxy = kCandleContractProxyMock()

  return {
    application: new ContractTradeJournalApplication(new ContractTradeJournalService(
      recordProxy as unknown as IContractTradeRecordProxy,
      tradingStrategyProxy as unknown as ITradingStrategyProxy,
      kCandleContractProxy as unknown as IKCandleContractProxy,
    )),
    recordProxy,
    tradingStrategyProxy,
    kCandleContractProxy,
  }
}

function draftFill(overrides: Partial<Record<keyof ContractTradeDraftFillDto, unknown>> = {}): ContractTradeDraftFillDto {
  const fill = {
    kind: 'entry', filledAt: new Date('2026-09-25T06:03:00Z'), priceText: '97905', quantityText: '0.030',
    liquidity: 'taker', feeText: '', ...overrides,
  } as Record<keyof ContractTradeDraftFillDto, never>

  return new ContractTradeDraftFillDto(fill.kind, fill.filledAt, fill.priceText, fill.quantityText, fill.liquidity, fill.feeText)
}

function draft(overrides: Partial<Record<keyof ContractTradeDraftDto, unknown>> = {}): ContractTradeDraftDto {
  const values = {
    symbol: 'btcusdt', direction: 'long', leverageText: '10', fills: [draftFill()],
    plannedStopLossText: '', plannedTakeProfitText: '', entryReason: '', confidence: null,
    tradingStrategyId: null, setupTagIds: [], journalLinkIdentifier: null, ...overrides,
  } as Record<keyof ContractTradeDraftDto, never>

  return new ContractTradeDraftDto(
    values.symbol, values.direction, values.leverageText, values.fills, values.plannedStopLossText,
    values.plannedTakeProfitText, values.entryReason, values.confidence, values.tradingStrategyId,
    values.setupTagIds, values.journalLinkIdentifier)
}

function kCandleContract(openTime: string): KCandleContract {
  return new KCandleContract(
    'BTCUSDT', new Date(openTime), new Decimal(1), new Decimal(2), new Decimal(0.5), new Decimal(1.5),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), 0,
    new ContractPriceLineVo(new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1)), null, null)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ContractTradeJournalApplication.listTrades', () => {
  it('摘要依序呈現最近 30 天的五個數字', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary()]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const list = await application.listTrades(new ContractTradeListFilterDto())

    expect(list.periodLabel).toBe('最近 30 天')
    expect(list.summaryFigures.map(figure => [figure.label, figure.text])).toEqual([
      ['淨損益', '+1,284.60'],
      ['勝率', '47%'],
      ['平均 R', '+0.38R'],
      ['獲利因子', '1.46'],
      ['費用佔毛利', '18%'],
    ])
    expect(list.summaryFigures.map(figure => figure.note)).toEqual([
      'USDT，已扣費用', '14 勝 16 敗', '每筆期望值', '總賺 ÷ 總賠', '手續費＋資金費',
    ])
    expect(recordProxy.findStatistics).toHaveBeenCalledWith('30d')
  })

  it('每一列呈現交易的每一項，淨損益以上漲色標示', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary()]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const [row] = (await application.listTrades(new ContractTradeListFilterDto())).rows

    expect(row).toMatchObject({
      id: 27,
      symbol: 'BTCUSDT',
      directionLabel: '做多 10 倍',
      directionTone: 'success',
      statusLabel: '已平倉',
      sourceLabel: 'BTC 趨勢跟隨',
      averageEntryPriceText: '97,927.6',
      averageExitPriceText: '100,420',
      rMultipleText: '+1.53R',
    })
    expect(row?.tags.map(tag => [tag.name, tag.tone])).toEqual([['突破', 'neutral']])
    expect(row?.profit.text).toBe('+120.53')
    expect(row?.profit.tone).toBe('success')
  })

  it.each([
    ['沒有關聯策略寫自行判斷', { tradingStrategyId: null, tradingStrategyName: null }, '自行判斷'],
    ['關聯策略已刪除', { tradingStrategyDeleted: true }, '關聯的交易策略已刪除'],
    ['從機器人連結記的寫機器人與第幾輪', {
      source: new TradeSource('BTC 趨勢跟隨', 412, new Decimal('97850'), null, null),
    }, 'BTC 趨勢跟隨 #412'],
  ])('%s', async (_, overrides, expectedSource) => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary(overrides)]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const [row] = (await application.listTrades(new ContractTradeListFilterDto())).rows

    expect(row?.sourceLabel).toBe(expectedSource)
  })

  it('持倉中的損益是浮動的，出場均價是「—」', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary({
      id: 32, status: 'open', averageExitPrice: null, netProfit: null, floatingProfit: measured('38.20'),
      rMultiple: unavailable('noStopLoss'),
    })]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const [row] = (await application.listTrades(new ContractTradeListFilterDto())).rows

    expect(row?.profit.text).toBe('+38.20')
    expect(row?.profit.note).toBe('浮')
    expect(row?.averageExitPriceText).toBe('—')
    expect(row?.rMultipleText).toBe('未設止損，算不出')
  })

  it('浮動損益估不出時寫出原因', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary({
      status: 'open', netProfit: null, floatingProfit: unavailable('noLatestPrice'),
    })]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const [row] = (await application.listTrades(new ContractTradeListFilterDto())).rows

    expect(row?.profit.text).toBe('沒有最新價，無法估算')
    expect(row?.profit.tone).toBe('muted')
  })

  it.each([
    ['淨損益為負時以下跌色標示', new Decimal('-76.40'), '−76.40', 'danger'],
    ['淨損益為零是中性', new Decimal('0'), '0.00', 'neutral'],
  ])('%s', async (_, netProfit, expectedText, expectedTone) => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary({ netProfit })]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const [row] = (await application.listTrades(new ContractTradeListFilterDto())).rows

    expect(row?.profit.text).toBe(expectedText)
    expect(row?.profit.tone).toBe(expectedTone)
  })

  it('待檢討數只算已平倉還沒檢討的', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([
      buildSummary({ id: 1, status: 'closed' }),
      buildSummary({ id: 2, status: 'closed' }),
      buildSummary({ id: 3, status: 'reviewed' }),
      buildSummary({ id: 4, status: 'open' }),
    ]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const list = await application.listTrades(new ContractTradeListFilterDto('closed'))

    expect(list.pendingReviewCount).toBe(2)
    expect(list.rows.map(row => row.id)).toEqual([1, 2])
  })

  it('依狀態、來源與合約標的篩選', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([
      buildSummary({ id: 1, symbol: 'BTCUSDT', status: 'open' }),
      buildSummary({ id: 2, symbol: 'ETHUSDT', status: 'open' }),
      buildSummary({ id: 3, symbol: 'BTCUSDT', status: 'closed' }),
      buildSummary({ id: 4, symbol: 'BTCUSDT', status: 'open', tradingStrategyId: null }),
    ]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const linked = await application.listTrades(new ContractTradeListFilterDto('open', 'linked', 'BTCUSDT'))
    const selfJudged = await application.listTrades(new ContractTradeListFilterDto('all', 'selfJudged'))

    expect(linked.rows.map(row => row.id)).toEqual([1])
    expect(linked.symbolOptions).toEqual(['BTCUSDT', 'ETHUSDT'])
    expect(selfJudged.rows.map(row => row.id)).toEqual([4])
  })

  it('一筆都沒有時說明兩種記法，摘要不顯示一堆 0', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics({ closedTradeCount: 0 }))

    const list = await application.listTrades(new ContractTradeListFilterDto())

    expect(list.emptyMessage).toContain('還沒有任何交易')
    expect(list.emptyMessage).toContain('記到交易日誌')
    expect(list.emptyMessage).toContain('記一筆')
    expect(list.summaryFigures).toEqual([])
  })

  it('有交易但篩選沒有結果時說沒有符合的', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.listTrades.mockResolvedValue(buildPage([buildSummary()]))
    recordProxy.findStatistics.mockResolvedValue(buildStatistics())

    const list = await application.listTrades(new ContractTradeListFilterDto('open'))

    expect(list.emptyMessage).toBe('沒有符合篩選的交易')
  })
})

describe('ContractTradeJournalApplication.getTrade', () => {
  it('已平倉的詳情逐項呈現結果', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord())

    const record = await application.getTrade(27)

    expect(record.outcome.figures.map(figure => [figure.label, figure.text])).toEqual([
      ['毛損益', '+127.11'],
      ['手續費', '5.06'],
      ['資金費用', '付出 1.52'],
      ['淨損益', '+120.53'],
      ['計畫風險', '78.93'],
      ['R 倍數', '+1.53R'],
      ['最大不利', '−0.53R'],
      ['最大有利', '+1.96R'],
      ['利潤捕捉率', '82%'],
      ['進場滑點', '0.06%'],
    ])
    expect(record.outcome.figureLabelled('最大不利')?.note).toBe('97,110')
    expect(record.outcome.pricePathUnavailableMessage).toBeNull()
    expect(record.outcome.figureGroups.map(group => group.map(figure => figure.label))).toEqual([
      ['毛損益', '手續費', '資金費用'],
      ['淨損益', '計畫風險', 'R 倍數'],
      ['最大不利', '最大有利', '利潤捕捉率', '進場滑點'],
    ])
    expect(record.holdingDurationText).toBe('持倉 1 天 2 小時')
    expect(record.originLabel).toBe('來自 BTC 趨勢跟隨・第 412 輪')
  })

  it.each([
    ['持倉中沒有持倉時長', { status: 'open', closedAt: null, source: null }, null, 'BTC 趨勢跟隨'],
    ['不是來自連結時寫關聯的策略', { source: null }, '持倉 1 天 2 小時', 'BTC 趨勢跟隨'],
    ['不是來自連結也沒有關聯時寫自行判斷', { source: null, tradingStrategyId: null, tradingStrategyName: null }, '持倉 1 天 2 小時', '自行判斷'],
  ])('%s', async (_, overrides, expectedDuration, expectedOrigin) => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord(overrides))

    const record = await application.getTrade(27)

    expect(record.holdingDurationText).toBe(expectedDuration)
    expect(record.originLabel).toBe(expectedOrigin)
  })

  it('來自連結的交易列出當時的建議', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord())

    const record = await application.getTrade(27)

    expect(record.source).toMatchObject({
      label: '來自 BTC 趨勢跟隨・第 412 輪',
      referencePriceText: '97,850',
      suggestedStopLossPriceText: '96,380',
      suggestedTakeProfitPriceText: '100,785',
    })
  })

  it('不是來自連結就沒有滑點', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({ source: null }))

    const record = await application.getTrade(27)

    expect(record.source).toBeNull()
    expect(record.outcome.figureLabelled('進場滑點')).toBeUndefined()
  })

  it('沒設止損時 R 相關的數字都寫算不出', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      plannedStopLossPrice: null,
      outcome: closedOutcome({
        plannedRisk: unavailable('noStopLoss'),
        rMultiple: unavailable('noStopLoss'),
        maximumAdverseExcursion: unavailable('noStopLoss'),
        maximumFavorableExcursion: unavailable('noStopLoss'),
      }),
    }))

    const record = await application.getTrade(31)

    expect(['R 倍數', '最大不利', '最大有利'].map(label => record.outcome.figureLabelled(label)?.text))
      .toEqual(['未設止損，算不出', '未設止損，算不出', '未設止損，算不出'])
    expect(record.outcome.figureLabelled('R 倍數')?.tone).toBe('muted')
    expect(record.plannedStopLossText).toBe('未設定')
  })

  it('沒有結算資料時寫原因並標示淨損益未含資金費用', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      outcome: closedOutcome({ fundingFee: unavailable('noFundingSettlements'), netProfitExcludesFunding: true }),
    }))

    const record = await application.getTrade(29)

    expect(record.outcome.figureLabelled('資金費用')?.text).toBe('沒有結算資料，無法計算')
    expect(record.outcome.figureLabelled('淨損益')?.note).toBe('未含資金費用')
  })

  it.each([
    ['收到資金費', '1.52', '收到 1.52', 'success'],
    ['沒跨過結算', '0', '0.00', 'neutral'],
  ])('%s', async (_, fundingFee, expectedText, expectedTone) => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({ outcome: closedOutcome({ fundingFee: measured(fundingFee) }) }))

    const record = await application.getTrade(27)

    expect(record.outcome.figureLabelled('資金費用')?.text).toBe(expectedText)
    expect(record.outcome.figureLabelled('資金費用')?.tone).toBe(expectedTone)
  })

  it('沒有行情資料時最大不利、最大有利、捕捉率與價格路徑都寫同一句', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      outcome: closedOutcome({
        maximumAdverseExcursion: unavailable('noMarketData'),
        maximumFavorableExcursion: unavailable('noMarketData'),
        profitCaptureRate: unavailable('noMarketData'),
        maximumAdversePrice: null,
        maximumFavorablePrice: null,
      }),
    }))

    const record = await application.getTrade(30)

    expect(['最大不利', '最大有利', '利潤捕捉率'].map(label => record.outcome.figureLabelled(label)?.text))
      .toEqual(['沒有行情資料，無法計算', '沒有行情資料，無法計算', '沒有行情資料，無法計算'])
    expect(record.outcome.pricePathUnavailableMessage).toBe('沒有行情資料，無法計算')
  })

  it('持倉中呈現估算的浮動損益與預估強平價，計畫與成交可以改、不能檢討', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      id: 32,
      status: 'open',
      closedAt: null,
      source: null,
      outcome: closedOutcome({
        floatingProfit: measured('38.20'),
        estimatedLiquidationPrice: measured('3751.2'),
      }),
    }))

    const record = await application.getTrade(32)

    expect(record.outcome.figureLabelled('浮動損益')).toMatchObject({ text: '+38.20', note: '估算' })
    expect(record.outcome.figureLabelled('預估強平價')).toMatchObject({ text: '3,751.2', note: '估算' })
    expect(record.outcome.figureLabelled('已實現淨損益')).toBeDefined()
    expect(record.planLocked).toBe(false)
    expect(record.canEditFills).toBe(true)
    expect(record.canWriteReview).toBe(false)
    expect(record.reviewUnavailableMessage).toBe('平倉後才能檢討')
    expect(record.statusLabel).toBe('持倉中')
  })

  it.each([
    ['沒有交易規格', 'estimatedLiquidationPrice', 'noTradingSpecification', '預估強平價', '還沒有交易規格，估不出'],
    ['沒有最新價', 'floatingProfit', 'noLatestPrice', '浮動損益', '沒有最新價，無法估算'],
  ])('持倉中%s時寫出原因', async (_, measureName, reason, label, expectedText) => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      status: 'open',
      outcome: closedOutcome({ [measureName]: unavailable(reason as 'noLatestPrice') }),
    }))

    const record = await application.getTrade(32)

    expect(record.outcome.figureLabelled(label)?.text).toBe(expectedText)
  })

  it('平倉後計畫與成交鎖定、可以檢討，成交與附註依時間由早到晚', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord())

    const record = await application.getTrade(27)

    expect(record.planLocked).toBe(true)
    expect(record.canEditFills).toBe(false)
    expect(record.canWriteReview).toBe(true)
    expect(record.fills.map(fill => fill.id)).toEqual([1, 2, 3])
    expect(record.fills[2]).toMatchObject({ kindLabel: '平倉', liquidityLabel: '掛單', feeNote: '未設定費率' })
    expect(record.notes.map(note => note.content)).toEqual(['第一則', '第二則'])
    expect(record.setupTags.map(tag => tag.name)).toEqual(['突破'])
    expect(record.mistakeTags.map(tag => tag.name)).toEqual(['提早出場'])
    expect(record.title).toBe('#27 BTCUSDT 做多 10 倍')
  })

  it('進場滑點對交易有利時不是下跌色', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({ outcome: closedOutcome({ entrySlippagePercentage: measured('-0.02') }) }))

    const record = await application.getTrade(27)

    expect(record.outcome.figureLabelled('進場滑點')).toMatchObject({ text: '−0.02%', tone: 'neutral' })
  })

  it('關聯的策略已刪除', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({ tradingStrategyDeleted: true }))

    expect((await application.getTrade(27)).sourceLabel).toBe('關聯的交易策略已刪除')
  })

  it('做空以做空色標示，已檢討帶出檢討內容', async () => {
    const { application, recordProxy } = buildFixture()
    const { TradeReview } = await import('~/domain/models/entities/trade-review')
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      direction: 'short',
      status: 'reviewed',
      review: new TradeReview('照計畫', '提早出場', '讓止盈成交', 4, new Date()),
      outcome: closedOutcome({ feeRateMissing: true, rMultiple: measured('-1.02') }),
    }))

    const record = await application.getTrade(26)

    expect(record.directionTone).toBe('danger')
    expect(record.statusLabel).toBe('已檢討')
    expect(record.review).toMatchObject({ wentWrong: '提早出場', executionScore: 4 })
    expect(record.outcome.figureLabelled('手續費')?.note).toBe('未設定費率')
    expect(record.outcome.figureLabelled('R 倍數')).toMatchObject({ text: '−1.02R', tone: 'danger' })
  })
})

describe('ContractTradeJournalApplication.previewDraft', () => {
  it('多筆進場即時算出持倉與均價', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft({
      fills: [draftFill(), draftFill({ priceText: '97960', quantityText: '0.021' })],
    }), takerFeeSetting())

    expect(preview.positionText).toBe('0.051')
    expect(preview.averageEntryPriceText).toBe('97,927.6')
  })

  it('填了止損即時顯示往下的距離與計畫風險', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft({
      fills: [draftFill(), draftFill({ priceText: '97960', quantityText: '0.021' })],
      plannedStopLossText: '96380',
    }), takerFeeSetting())

    expect(preview.stopLossDistanceText).toBe('往下 1.58%')
    expect(preview.plannedRiskText).toBe('78.93')
  })

  it('做空的止損在上方', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft({
      direction: 'short', fills: [draftFill({ priceText: '3500', quantityText: '1' })], plannedStopLossText: '3535',
    }), takerFeeSetting())

    expect(preview.stopLossDistanceText).toBe('往上 1.00%')
  })

  it('手續費依吃單費率自動帶出', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft(), takerFeeSetting())

    expect(preview.fees[0]?.automaticFeeText).toBe('1.47')
    expect(preview.fees[0]?.note).toBeNull()
    expect(preview.feeRateMissing).toBe(false)
  })

  it('掛單用掛單費率', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft({ fills: [draftFill({ liquidity: 'maker' })] }), takerFeeSetting())

    expect(preview.fees[0]?.automaticFeeText).toBe('0.59')
  })

  it('尚未設定費率時手續費為 0 並提示', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft(), unconfiguredFeeSetting())

    expect(preview.fees[0]).toMatchObject({ automaticFeeText: '0.00', note: '尚未設定手續費率' })
    expect(preview.feeRateMissing).toBe(true)
  })

  it('加成交時連同既有成交一起算', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      fills: [buildRecord().fills[1]],
      status: 'open',
    }))
    const record = await application.getTrade(27)

    const preview = application.previewDraft(draft({
      symbol: '', fills: [draftFill({ kind: 'exit', priceText: '100000', quantityText: '0.010' })],
    }), takerFeeSetting(), record.fills)

    expect(preview.positionText).toBe('0.02')
    expect(preview.averageEntryPriceText).toBe('97,905')
    expect(preview.missingFieldMessage).toBeNull()
  })

  it.each([
    ['沒填合約標的', { symbol: '  ' }, '請填合約標的'],
    ['成交價讀不懂', { fills: [draftFill({ priceText: 'abc' })] }, '第 1 筆的價格與數量要填大於零的數字'],
    ['數量為零', { fills: [draftFill({ quantityText: '0' })] }, '第 1 筆的價格與數量要填大於零的數字'],
    ['只有出場', { fills: [draftFill({ kind: 'exit' })] }, '至少要有一筆填好開倉價與數量的開倉'],
    ['新增時沒有成交', { fills: [] }, '至少要有一筆填好開倉價與數量的開倉'],
  ])('%s時說出缺什麼', (_, overrides, expectedMessage) => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft(overrides), takerFeeSetting())

    expect(preview.missingFieldMessage).toBe(expectedMessage)
  })

  it('還沒有進場均價時不算距離', () => {
    const { application } = buildFixture()

    const preview = application.previewDraft(draft({ fills: [], plannedStopLossText: '96380' }), takerFeeSetting())

    expect(preview.averageEntryPriceText).toBeNull()
    expect(preview.stopLossDistanceText).toBeNull()
    expect(preview.plannedRiskText).toBeNull()
  })
})

describe('ContractTradeJournalApplication.draftDiffers', () => {
  it('改過內容才算改過', () => {
    const { application } = buildFixture()
    const initial = draft()

    expect(application.draftDiffers(draft(), initial, takerFeeSetting())).toBe(false)
    expect(application.draftDiffers(draft({ fills: [draftFill({ priceText: '97906' })] }), initial, takerFeeSetting())).toBe(true)
  })
})

describe('ContractTradeJournalApplication.recordDraft', () => {
  it('第一筆進場隨新增送出，其餘依序加成交，合約標的轉大寫', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockResolvedValue(buildRecord({ status: 'open' }))

    await application.recordDraft(draft({
      fills: [draftFill(), draftFill({ priceText: '97960', quantityText: '0.021', feeText: '1.20' })],
      plannedStopLossText: '96380',
      journalLinkIdentifier: 'link-412',
      tradingStrategyId: 5,
      setupTagIds: [1],
    }), takerFeeSetting())

    const [writeDto] = recordProxy.recordTrade.mock.calls[0] as [import('~/domain/models/dto/contract-trade-record-write-dto').ContractTradeRecordWriteDto]
    expect(writeDto.symbol).toBe('BTCUSDT')
    expect(writeDto.firstEntryFill.price.toString()).toBe('97905')
    expect(writeDto.firstEntryFill.fee).toBeNull()
    expect(writeDto.plannedStopLossPrice?.toString()).toBe('96380')
    expect(writeDto.journalLinkIdentifier).toBe('link-412')
    expect(writeDto.leverage?.toString()).toBe('10')
    const [tradeId, secondFill] = recordProxy.addFill.mock.calls[0] as [number, ContractTradeFillWriteDto]
    expect(tradeId).toBe(27)
    expect(secondFill.fee?.toString()).toBe('1.2')
  })

  it('只有一筆時不加成交，槓桿留白就不送', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))

    const record = await application.recordDraft(draft({ leverageText: '' }), takerFeeSetting())

    expect(recordProxy.addFill).not.toHaveBeenCalled()
    expect(record.id).toBe(27)
    expect(recordProxy.recordTrade.mock.calls[0]?.[0].leverage).toBeNull()
  })

  it('缺東西時不送出，拒絕寫出缺什麼', async () => {
    const { application, recordProxy } = buildFixture()

    await expect(application.recordDraft(draft({ symbol: '' }), takerFeeSetting()))
      .rejects.toThrow('請填合約標的')
    expect(recordProxy.recordTrade).not.toHaveBeenCalled()
  })

  it('後面的成交被拒時說已建立哪一筆、第幾筆沒存成功', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new TradeRejectedError(
      '出場數量超過目前持倉 0.030', new TradeFormFieldVo('exitQuantity')))

    const failure = await application.recordDraft(draft({
      fills: [draftFill(), draftFill({ kind: 'exit', quantityText: '0.05' })],
    }), takerFeeSetting()).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(TradeRejectedError)
    expect((failure as TradeRejectedError).message).toBe('已建立 #27，但第 2 筆沒有存成功：出場數量超過目前持倉 0.030')
    expect((failure as TradeRejectedError).recordedTradeId).toBe(27)
  })

  it('後面的成交連不上時原樣往上拋', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new Error('network'))

    await expect(application.recordDraft(draft({ fills: [draftFill(), draftFill()] }), takerFeeSetting()))
      .rejects.toThrow('network')
  })
})

describe('ContractTradeJournalApplication.addDraftFills', () => {
  it('對既有交易依序加成交，回最後一次的結果', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.addFill.mockResolvedValueOnce(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockResolvedValueOnce(buildRecord({ status: 'closed' }))

    const record = await application.addDraftFills(27, draft({
      symbol: '', fills: [draftFill(), draftFill({ kind: 'exit', quantityText: '0.081' })],
    }), takerFeeSetting(), [])

    expect(recordProxy.addFill).toHaveBeenCalledTimes(2)
    expect(record.statusLabel).toBe('已平倉')
  })

  it('出場超過持倉的拒絕原樣帶回', async () => {
    const { application, recordProxy } = buildFixture()
    const rejection = new TradeRejectedError(
      '出場數量超過目前持倉 0.031，要反手請先平倉再新增一筆反方向的交易', new TradeFormFieldVo('exitQuantity'))
    recordProxy.addFill.mockRejectedValue(rejection)

    await expect(application.addDraftFills(27, draft({ symbol: '', fills: [draftFill({ kind: 'exit', quantityText: '0.05' })] }), takerFeeSetting(), buildRecord().toDomain().toDto().fills))
      .rejects.toBe(rejection)
  })

  it('成交讀不懂時不送出', async () => {
    const { application, recordProxy } = buildFixture()

    await expect(application.addDraftFills(27, draft({ fills: [draftFill({ priceText: '' })] }), takerFeeSetting(), []))
      .rejects.toThrow('第 1 筆的價格與數量')
    expect(recordProxy.addFill).not.toHaveBeenCalled()
  })

  it('沒有要加的成交時不送出', async () => {
    const { application, recordProxy } = buildFixture()

    await expect(application.addDraftFills(27, draft({ fills: [] }), takerFeeSetting(), buildRecord().toDomain().toDto().fills))
      .rejects.toThrow('至少要有一筆')
    expect(recordProxy.addFill).not.toHaveBeenCalled()
  })

  it('只加一筆時回那一次的結果', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.addFill.mockResolvedValue(buildRecord({ status: 'open' }))

    const record = await application.addDraftFills(27, draft({ fills: [draftFill()] }), takerFeeSetting(), [])

    expect(record.statusLabel).toBe('持倉中')
  })
})

describe('ContractTradeJournalApplication 其餘寫入', () => {
  it.each([
    ['修正成交', (application: ContractTradeJournalApplication) => application.amendFill(27, new ContractTradeFillAmendmentDto(buildRecord().toDomain().toDto().fills[0]!, '1', '1', '')), 'amendFill'],
    ['刪除成交', (application: ContractTradeJournalApplication) => application.removeFill(27, 1), 'removeFill'],
    ['修改計畫', (application: ContractTradeJournalApplication) => application.amendPlan(27, new TradePlanInputDto('', '', '', null)), 'amendPlan'],
    ['寫檢討', (application: ContractTradeJournalApplication) => application.writeReview(27, new TradeReviewWriteDto('a', 'b', 'c', 4, [2])), 'writeReview'],
    ['貼型態標籤', (application: ContractTradeJournalApplication) => application.assignSetupTags(27, [1]), 'assignSetupTags'],
  ] as const)('%s回傳更新後的這一筆', async (_, act, proxyMethod) => {
    const { application, recordProxy } = buildFixture()
    recordProxy[proxyMethod].mockResolvedValue(buildRecord({ status: 'reviewed' }))

    const record = await act(application)

    expect(record.statusLabel).toBe('已檢討')
    expect(recordProxy[proxyMethod]).toHaveBeenCalled()
  })

  it('修改計畫把輸入讀成數字，讀不懂的當作沒有', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.amendPlan.mockResolvedValue(buildRecord({ status: 'open' }))

    await application.amendPlan(27, new TradePlanInputDto('96,300', 'abc', '理由', 4))

    const [, planWriteDto] = recordProxy.amendPlan.mock.calls[0] as [number, import('~/domain/models/dto/trade-plan-write-dto').TradePlanWriteDto]
    expect(planWriteDto.plannedStopLossPrice?.toString()).toBe('96300')
    expect(planWriteDto.plannedTakeProfitPrice).toBeNull()
  })

  it('修正成交時讀不懂的價量不送出，說出要填數字', async () => {
    const { application, recordProxy } = buildFixture()
    const fill = buildRecord().toDomain().toDto().fills[0]!

    const failure = await application.amendFill(27, new ContractTradeFillAmendmentDto(fill, 'abc', '0.03', '')).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(TradeRejectedError)
    expect((failure as TradeRejectedError).message).toBe('價格與數量要填數字')
    expect(recordProxy.amendFill).not.toHaveBeenCalled()
  })

  it('修正成交送出新的價量與手續費', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.amendFill.mockResolvedValue(buildRecord({ status: 'open' }))
    const fill = buildRecord().toDomain().toDto().fills[0]!

    await application.amendFill(27, new ContractTradeFillAmendmentDto(fill, '97906', '0.03', '1.2'))

    const [, fillId, fillWriteDto] = recordProxy.amendFill.mock.calls[0] as [number, number, ContractTradeFillWriteDto]
    expect(fillId).toBe(1)
    expect(fillWriteDto.price.toString()).toBe('97906')
    expect(fillWriteDto.fee?.toString()).toBe('1.2')
  })

  it('附註去掉前後空白再送', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.addNote.mockResolvedValue(buildRecord())

    await application.addNote(27, '  止損其實是 96,300  ')

    expect(recordProxy.addNote).toHaveBeenCalledWith(27, '止損其實是 96,300')
  })

  it('刪除交易', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.deleteTrade.mockResolvedValue(undefined)

    await application.deleteTrade(33)

    expect(recordProxy.deleteTrade).toHaveBeenCalledWith(33)
  })
})

describe('ContractTradeJournalApplication.openJournalLink', () => {
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

  it('預填那一輪的建議', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findJournalLink.mockResolvedValue(prefill())

    const prefillDto = await application.openJournalLink('link-412')

    expect(prefillDto).toMatchObject({
      mode: 'newTrade',
      targetPath: null,
      sourceLabel: '來自 BTC 趨勢跟隨・第 412 輪',
      referencePriceText: '97,850',
      notice: null,
      symbol: 'BTCUSDT',
      tradingStrategyId: 5,
    })
    expect(prefillDto.entryPrice?.toString()).toBe('97850')
    expect(prefillDto.quantity?.toString()).toBe('0.051')
  })

  it('已有持倉中時改為加成交', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ mode: 'addEntryFill', targetTradeId: 27 }))

    const prefillDto = await application.openJournalLink('link-412')

    expect(prefillDto.mode).toBe('addEntryFill')
    expect(prefillDto.targetPath).toBe('/contract-trade-journal/27')
    expect(prefillDto.notice).toBe('BTCUSDT 做多已有持倉中的 #27，這一輪記成加碼')
  })

  it('舊的一輪沒有參考價時進場價與數量留白並說明', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findJournalLink.mockResolvedValue(prefill({ referencePrice: null }))

    const prefillDto = await application.openJournalLink('link-412')

    expect(prefillDto.entryPrice).toBeNull()
    expect(prefillDto.quantity).toBeNull()
    expect(prefillDto.referencePriceText).toBeNull()
    expect(prefillDto.notice).toBe('這一輪沒有記下參考價，請手動填寫進場價與數量')
    expect(prefillDto.plannedStopLossPrice?.toString()).toBe('96380')
  })
})

describe('ContractTradeJournalApplication.getStatistics', () => {
  it('呈現各數字、累積 R、分布、失誤成本與兩組比較', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findStatistics.mockResolvedValue(buildStatistics({
      excludedFromRMultipleCount: 3,
      cumulativeRMultiples: [new ContractTradeCumulativePoint(new Date('2026-09-01T00:00:00Z'), new Decimal('1.5'))],
      rMultipleDistribution: [
        new ContractTradeDistributionBucket('≤−1R', 12, false),
        new ContractTradeDistributionBucket('1~2R', 6, true),
      ],
      mistakeCosts: [
        new ContractTradeMistakeCost('移動止損', 4, new Decimal('-3.2')),
        new ContractTradeMistakeCost('追價進場', 2, new Decimal('-1.6')),
      ],
    }))

    const statistics = await application.getStatistics('30d')

    expect(statistics.emptyMessage).toBeNull()
    expect(statistics.figures.map(figure => [figure.label, figure.text])).toEqual([
      ['淨損益', '+1,284.60'],
      ['勝率', '47%'],
      ['平均 R', '+0.38R'],
      ['獲利因子', '1.46'],
      ['平均進場滑點', '0.07%'],
      ['費用佔毛利', '18%'],
    ])
    expect(statistics.exclusionNote).toBe('3 筆沒設止損，未計入 R')
    expect(statistics.cumulativePoints[0]?.value).toBe(1.5)
    expect(statistics.distribution.map(bar => [bar.tone, bar.widthPercentage])).toEqual([['danger', 100], ['success', 50]])
    expect(statistics.mistakeCosts[0]).toMatchObject({ tagName: '移動止損', tradeCountText: '4 筆', rMultipleText: '−3.20R', tone: 'danger' })
    expect(statistics.mistakeCosts.map(mistakeCost => mistakeCost.widthPercentage)).toEqual([100, 50])
    expect(statistics.closedTradeCountText).toBe('已平倉 30 筆')
    expect(statistics.sourceComparison).toEqual([
      expect.objectContaining({ label: '有關聯策略', tradeCountText: '22 筆', winRateText: '56%', averageRMultipleText: '+0.71R' }),
      expect.objectContaining({ label: '自行判斷', tradeCountText: '8 筆', winRateText: '25%', averageRMultipleText: '−0.28R' }),
    ])
    expect(recordProxy.findStatistics).toHaveBeenCalledWith('30d')
  })

  it('期間內沒有已平倉交易時不畫空圖、不寫 0%', async () => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findStatistics.mockResolvedValue(buildStatistics({ period: '7d', closedTradeCount: 0, winRate: null }))

    const statistics = await application.getStatistics('7d')

    expect(statistics.emptyMessage).toBe('這段期間沒有已平倉交易')
    expect(statistics.periodLabel).toBe('最近 7 天')
    expect(statistics.figures).toEqual([])
    expect(statistics.cumulativePoints).toEqual([])
  })

  it.each([
    ['沒有虧損交易時獲利因子不適用', { profitFactor: null }, '獲利因子', '不適用'],
    ['沒有來自連結的交易', { averageEntrySlippagePercentage: null, slippageTradeCount: 0 }, '平均進場滑點', '沒有來自機器人連結的交易'],
    ['平均 R 算不出', { averageRMultiple: null }, '平均 R', '不適用'],
    ['勝率不適用', { winRate: null }, '勝率', '不適用'],
  ])('%s', async (_, overrides, label, expectedText) => {
    const { application, recordProxy } = buildFixture()
    recordProxy.findStatistics.mockResolvedValue(buildStatistics(overrides))

    const statistics = await application.getStatistics('30d')

    expect(statistics.figures.find(figure => figure.label === label)?.text).toBe(expectedText)
  })

  it('兩組比較裡沒有平均 R 時寫不適用', async () => {
    const { application, recordProxy } = buildFixture()
    const { ContractTradeSourceGroup } = await import('~/domain/models/entities/contract-trade-source-group')
    recordProxy.findStatistics.mockResolvedValue(buildStatistics({ selfJudgedGroup: new ContractTradeSourceGroup(0, null, null) }))

    const statistics = await application.getStatistics('30d')

    expect(statistics.sourceComparison[1]).toMatchObject({ winRateText: '不適用', averageRMultipleText: '不適用' })
  })

  it('期間選項依序是 7、30、90 天與全部', () => {
    const { application } = buildFixture()

    expect(application.listStatisticsPeriods().map(option => [option.value, option.label])).toEqual([
      ['7d', '最近 7 天'], ['30d', '最近 30 天'], ['90d', '最近 90 天'], ['all', '全部期間'],
    ])
  })
})

describe('ContractTradeJournalApplication.getLiveComparison', () => {
  it('每個標的一列，實盤勝率低於回測時以下跌色標示差距', async () => {
    const { application, tradingStrategyProxy } = buildFixture()
    tradingStrategyProxy.findContractTradeComparison.mockResolvedValue(new ContractTradeLiveComparison('ETH 均值回歸', false, [
      new ContractTradeLiveComparisonRow('ETHUSDT', new ContractTradePerformance(8, 0.38, 0.5, null), new ContractTradePerformance(20, 0.61, 0.6, 0.62), null),
      new ContractTradeLiveComparisonRow('BTCUSDT', new ContractTradePerformance(4, 0.75, 0.75, null), new ContractTradePerformance(10, 0.5, 0.5, null), null),
    ]))

    const comparison = await application.getLiveComparison(9)

    expect(comparison.notice).toBeNull()
    expect(comparison.rows[0]).toMatchObject({
      symbol: 'ETHUSDT', liveWinRateTone: 'danger', winRateGapText: '比回測低 23 個百分點', backtestUnavailableMessage: null,
    })
    expect(comparison.rows[0]?.live).toMatchObject({ closedTradeCountText: '8 筆', winRateText: '38%', shortWinRateText: '不適用' })
    expect(comparison.rows[0]?.backtest?.winRateText).toBe('61%')
    expect(comparison.rows[1]).toMatchObject({ liveWinRateTone: 'neutral', winRateGapText: null })
  })

  it('其中一列重演失敗時實盤照常呈現，回測欄寫原因', async () => {
    const { application, tradingStrategyProxy } = buildFixture()
    tradingStrategyProxy.findContractTradeComparison.mockResolvedValue(new ContractTradeLiveComparison('BTC 趨勢跟隨', false, [
      new ContractTradeLiveComparisonRow('ETHUSDT', new ContractTradePerformance(3, 0.33, 0.33, null), null, '合約行情不夠'),
    ]))

    const [row] = (await application.getLiveComparison(5)).rows

    expect(row?.live.winRateText).toBe('33%')
    expect(row?.backtest).toBeNull()
    expect(row?.backtestUnavailableMessage).toBe('合約行情不夠，無法重演')
  })

  it('策略已刪除時說無法重演，實盤照常', async () => {
    const { application, tradingStrategyProxy } = buildFixture()
    tradingStrategyProxy.findContractTradeComparison.mockResolvedValue(new ContractTradeLiveComparison('舊策略', true, [
      new ContractTradeLiveComparisonRow('BTCUSDT', new ContractTradePerformance(3, 0.33, 0.33, null), null, null),
    ]))

    const comparison = await application.getLiveComparison(5)

    expect(comparison.notice).toBe('交易策略已刪除，無法重演')
    expect(comparison.rows[0]?.backtestUnavailableMessage).toBe('交易策略已刪除，無法重演')
  })

  it('沒有已平倉實單時說還沒有可以對照的', async () => {
    const { application, tradingStrategyProxy } = buildFixture()
    tradingStrategyProxy.findContractTradeComparison.mockResolvedValue(new ContractTradeLiveComparison('BTC 趨勢跟隨', false, []))

    expect((await application.getLiveComparison(5)).notice).toBe('還沒有已平倉的實單可以對照')
  })
})

describe('ContractTradeJournalApplication.getPricePath', () => {
  it('取第一筆進場前後的行情，標出每筆進出場與計畫線', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T00:00:00Z'))
    const { application, recordProxy, kCandleContractProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord())
    kCandleContractProxy.findKCandleContractSeries.mockResolvedValue(
      new KCandleContractSeriesVo([kCandleContract('2026-09-25T06:00:00Z')], { value: '1h' } as never))
    const record = await application.getTrade(27)

    const pricePath = await application.getPricePath(record)

    const [loadPlan] = kCandleContractProxy.findKCandleContractSeries.mock.calls[0] as [import('~/domain/models/vo/k-candle-chart-load-plan-vo').KCandleChartLoadPlanVo]
    expect(loadPlan.symbol).toBe('BTCUSDT')
    expect(loadPlan.fetchStartTime.getTime()).toBeLessThan(record.openedAt.getTime())
    expect(loadPlan.fetchEndTime.getTime()).toBeGreaterThan(record.closedAt?.getTime() ?? 0)
    expect(pricePath.emptyMessage).toBeNull()
    expect(pricePath.markers.map(marker => marker.text)).toEqual(['開倉 97,905', '加倉 97,960', '平倉 100,420'])
    expect(pricePath.lines.map(line => `${line.label} ${line.priceText}`)).toEqual([
      '開倉均價 97,927.6', '計畫止損 96,380', '計畫止盈 100,785', '最大不利 97,110', '最大有利 100,960',
    ])
    expect(pricePath.candles).toHaveLength(1)
  })

  it('沒有計畫線也沒有極值時只畫進場均價', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T00:00:00Z'))
    const { application, recordProxy, kCandleContractProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      plannedStopLossPrice: null,
      plannedTakeProfitPrice: null,
      outcome: closedOutcome({ maximumAdversePrice: null, maximumFavorablePrice: null }),
    }))
    kCandleContractProxy.findKCandleContractSeries.mockResolvedValue(
      new KCandleContractSeriesVo([kCandleContract('2026-09-25T06:00:00Z')], { value: '1h' } as never))
    const record = await application.getTrade(27)

    expect((await application.getPricePath(record)).lines.map(line => line.label)).toEqual(['開倉均價'])
  })

  it('持倉中的行情取到現在為止，沒有行情時寫同一句話', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-25T07:00:00Z'))
    const { application, recordProxy, kCandleContractProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({ status: 'open', closedAt: null, plannedStopLossPrice: null }))
    kCandleContractProxy.findKCandleContractSeries.mockResolvedValue(new KCandleContractSeriesVo([], { value: '1m' } as never))
    const record = await application.getTrade(32)

    const pricePath = await application.getPricePath(record)

    const [loadPlan] = kCandleContractProxy.findKCandleContractSeries.mock.calls[0] as [import('~/domain/models/vo/k-candle-chart-load-plan-vo').KCandleChartLoadPlanVo]
    expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-25T07:00:00.000Z')
    expect(pricePath.emptyMessage).toBe('沒有行情資料，無法計算')
  })
})

describe('ContractTradeJournalApplication 開倉、加倉、減倉、平倉', () => {
  it('依時間順序與持倉標出每一筆', async () => {
    const { ContractTradeFill } = await import('~/domain/models/entities/contract-trade-fill')
    const { application, recordProxy } = buildFixture()
    recordProxy.findTrade.mockResolvedValue(buildRecord({
      fills: [
        new ContractTradeFill(4, 'exit', new Date('2026-09-26T08:00:00Z'), new Decimal('100420'), new Decimal('0.031'), 'taker', new Decimal('1'), false),
        new ContractTradeFill(1, 'entry', new Date('2026-09-25T06:03:00Z'), new Decimal('97905'), new Decimal('0.030'), 'taker', new Decimal('1'), false),
        new ContractTradeFill(3, 'exit', new Date('2026-09-26T02:00:00Z'), new Decimal('99000'), new Decimal('0.020'), 'taker', new Decimal('1'), false),
        new ContractTradeFill(2, 'entry', new Date('2026-09-25T06:11:00Z'), new Decimal('97960'), new Decimal('0.021'), 'taker', new Decimal('1'), false),
      ],
    }))

    const record = await application.getTrade(27)

    expect(record.fills.map(fill => fill.kindLabel)).toEqual(['開倉', '加倉', '減倉', '平倉'])
  })
})
