import Decimal from 'decimal.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleApplication } from '~/application/k-candle-application'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleIdentityDto } from '~/domain/models/dto/k-candle-identity-dto'
import { KCandleFieldError } from '~/domain/errors/k-candle-field-error'
import { KCandleService } from '~/domain/service/k-candle-service'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { buildKCandleContractProxy } from '../fixtures/contract-proxies'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'

// 只 mock 最外層的 proxy 介面，domain service 與 domain model 都是真的——
// 這是刻意的「測試力度放大」（見 .claude/rules/testing.md）。
const START_TIME = new Date('2026-08-30T00:00:00.000Z')
const FUTURE_TIME = new Date('2126-08-30T12:00:00.000Z')

function buildKCandle(openTime: string, open: string, close: string): KCandle {
  return new KCandle(
    'BTCUSDT',
    new Date(openTime),
    new Decimal(open),
    new Decimal('120'),
    new Decimal('90'),
    new Decimal(close),
    new Decimal('11'),
    new Decimal('1200'),
    new Decimal('5'),
    new Decimal('600'),
  )
}

function buildProxy(overrides: Partial<IKCandleProxy> = {}): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn().mockResolvedValue([]),
    findKCandleSeries: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function buildApplication(kCandleProxy: IKCandleProxy): KCandleApplication {
  return new KCandleApplication(new KCandleService(kCandleProxy, buildKCandleContractProxy()))
}

describe('KCandleApplication', () => {
  it('查詢成功時回傳由新到舊、帶漲跌的結果', async () => {
    const kCandleApplication = buildApplication(buildProxy({
      findKCandlesInRange: vi.fn().mockResolvedValue([
        buildKCandle('2026-08-30T10:05:00.000Z', '100', '90'),
        buildKCandle('2026-08-30T10:00:00.000Z', '100', '110'),
      ]),
    }))

    const result = await kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME),
    )

    expect(result.count).toBe(2)
    expect(result.kCandles[0]?.openTime.toISOString()).toBe('2026-08-30T10:05:00.000Z')
    expect(result.kCandles[0]?.trend.value).toBe('down')
    expect(result.kCandles[1]?.trend.value).toBe('up')
  })

  it('查無資料時回傳空結果', async () => {
    const kCandleApplication = buildApplication(buildProxy({
      findKCandlesInRange: vi.fn().mockResolvedValue([]),
    }))

    const result = await kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME),
    )

    expect(result.isEmpty).toBe(true)
    expect(result.count).toBe(0)
  })

  it.each([
    { description: '未指定交易標的', symbol: '', expectedField: 'symbol', expectedMessage: '請指定交易標的' },
    { description: '交易標的只有空白', symbol: '  ', expectedField: 'symbol', expectedMessage: '請指定交易標的' },
  ])('$description 時以可修正的條件錯誤拒絕', async ({ symbol, expectedField, expectedMessage }) => {
    const kCandleApplication = buildApplication(buildProxy({ findKCandlesInRange: vi.fn() }))

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto(symbol, START_TIME),
    )).rejects.toThrow(expectedMessage)

    await kCandleApplication.searchKCandles(new KCandleQueryDto(symbol, START_TIME))
      .catch((error: unknown) => {
        expect((error as KCandleQueryValidationError).field).toBe(expectedField)
      })
  })

  it('開始時間晚於目前時間時以可修正的條件錯誤拒絕', async () => {
    const kCandleApplication = buildApplication(buildProxy({ findKCandlesInRange: vi.fn() }))

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', FUTURE_TIME),
    )).rejects.toThrow('開始時間不得晚於目前時間')
  })

  it('後端以業務規則拒絕時，原因原封往上傳', async () => {
    const kCandleApplication = buildApplication(buildProxy({
      findKCandlesInRange: vi.fn().mockRejectedValue(
        new BackendRequestRejectedError('時間區間過大，請縮小區間（單次最多 1000 根）'),
      ),
    }))

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME),
    )).rejects.toThrow('時間區間過大，請縮小區間（單次最多 1000 根）')
  })

  it('連不上後端時以連線錯誤往上傳', async () => {
    const kCandleApplication = buildApplication(buildProxy({
      findKCandlesInRange: vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles')),
    }))

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME),
    )).rejects.toBeInstanceOf(BackendUnreachableError)
  })

  describe('維護 K 線', () => {
    const OPEN_TIME = new Date('2026-08-30T09:00:00.000Z')

    function buildWriteDto(overrides: { symbol?: string, close?: string } = {}): KCandleWriteDto {
      return new KCandleWriteDto(
        overrides.symbol ?? 'BTCUSDT', OPEN_TIME,
        '100', '120', '90', overrides.close ?? '110', '11', '1200', '5', '600')
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('新增成功時回傳存下來的那一根，含算好的漲跌', async () => {
      const kCandleApplication = buildApplication(buildProxy({
        saveKCandle: vi.fn().mockResolvedValue(buildKCandle('2026-08-30T09:00:00.000Z', '100', '90')),
      }))

      const savedKCandle = await kCandleApplication.saveKCandle(buildWriteDto())

      expect(savedKCandle.trend.value).toBe('down')
    })

    it.each([
      { useCase: '新增', run: (application: KCandleApplication) => application.saveKCandle(buildWriteDto({ symbol: '' })) },
      { useCase: '修改', run: (application: KCandleApplication) => application.updateKCandle(buildWriteDto({ close: '一百' })) },
    ])('$useCase 的輸入不合法時，以可修正的欄位錯誤拒絕', async ({ run }) => {
      const kCandleProxy = buildProxy()
      const kCandleApplication = buildApplication(kCandleProxy)

      await expect(run(kCandleApplication)).rejects.toBeInstanceOf(KCandleFieldError)
      expect(kCandleProxy.saveKCandle).not.toHaveBeenCalled()
      expect(kCandleProxy.updateKCandle).not.toHaveBeenCalled()
    })

    it('後端說找不到那一根時，原因原封往上傳', async () => {
      const kCandleApplication = buildApplication(buildProxy({
        updateKCandle: vi.fn().mockRejectedValue(new BackendRequestRejectedError('找不到該根 K 線')),
      }))

      await expect(kCandleApplication.updateKCandle(buildWriteDto()))
        .rejects.toThrow('找不到該根 K 線')
    })

    it('刪除時連不上後端，以連線錯誤往上傳', async () => {
      const kCandleApplication = buildApplication(buildProxy({
        deleteKCandle: vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles')),
        catchUpSymbol: vi.fn().mockResolvedValue(0),
      }))

      await expect(kCandleApplication.deleteKCandle(new KCandleIdentityDto('BTCUSDT', OPEN_TIME)))
        .rejects.toBeInstanceOf(BackendUnreachableError)
    })
  })

  describe('查合約 K 線', () => {
    function priceLine(close: string): ContractPriceLineVo {
      return new ContractPriceLineVo(new Decimal(close), new Decimal(close), new Decimal(close), new Decimal(close))
    }

    function buildKCandleContract(
      openTime: string, open: string, close: string,
      laterLines: { indexClose: string, premiumIndexClose: string } | null,
    ): KCandleContract {
      return new KCandleContract(
        'BTCUSDT', new Date(openTime),
        new Decimal(open), new Decimal('120'), new Decimal('90'), new Decimal(close),
        new Decimal('11'), new Decimal('1200'), new Decimal('5'), new Decimal('600'),
        42, priceLine('110.6'),
        laterLines === null ? null : priceLine(laterLines.indexClose),
        laterLines === null ? null : priceLine(laterLines.premiumIndexClose),
      )
    }

    function buildContractApplication(
      kCandleContractProxy: IKCandleContractProxy,
      kCandleProxy: IKCandleProxy = buildProxy(),
    ): KCandleApplication {
      return new KCandleApplication(new KCandleService(kCandleProxy, kCandleContractProxy))
    }

    it('由新到舊列出，每一根帶著三條線的收盤與成交筆數', async () => {
      const kCandleApplication = buildContractApplication(buildKCandleContractProxy({
        findKCandleContractsInRange: vi.fn().mockResolvedValue([
          buildKCandleContract('2026-08-30T08:00:00.000Z', '100', '110', { indexClose: '110.7', premiumIndexClose: '0.0001' }),
          buildKCandleContract('2026-08-30T08:01:00.000Z', '100', '90', { indexClose: '110.8', premiumIndexClose: '-0.0005' }),
        ]),
      }))

      const result = await kCandleApplication.searchKCandleContracts(
        new KCandleQueryDto('BTCUSDT', START_TIME))

      expect(result.count).toBe(2)
      expect(result.kCandleContracts.map(kCandleContract => kCandleContract.openTime.toISOString()))
        .toEqual(['2026-08-30T08:01:00.000Z', '2026-08-30T08:00:00.000Z'])
      const [newest] = result.kCandleContracts
      expect(newest?.tradeCount).toBe(42)
      expect(newest?.markPriceLine.close.toString()).toBe('110.6')
      expect(newest?.indexPriceLine?.close.toString()).toBe('110.8')
      expect(newest?.premiumIndexLine?.close.toString()).toBe('-0.0005')
    })

    it('漲跌照成交價判斷，與現貨同一套', async () => {
      const kCandleApplication = buildContractApplication(buildKCandleContractProxy({
        findKCandleContractsInRange: vi.fn().mockResolvedValue([
          buildKCandleContract('2026-08-30T08:01:00.000Z', '100', '90', null),
          buildKCandleContract('2026-08-30T08:00:00.000Z', '100', '110', null),
          buildKCandleContract('2026-08-29T08:00:00.000Z', '0', '0', null),
        ]),
      }))

      const result = await kCandleApplication.searchKCandleContracts(
        new KCandleQueryDto('BTCUSDT', START_TIME))

      expect(result.kCandleContracts.map(kCandleContract => kCandleContract.trend.label))
        .toEqual(['下跌', '上漲', '持平'])
      expect(result.kCandleContracts[0]?.priceChange.toString()).toBe('-10')
      expect(result.kCandleContracts[0]?.priceChangePercent?.toString()).toBe('-10')
      expect(result.kCandleContracts[2]?.priceChangePercent).toBeNull()
    })

    it('舊合約 K 線沒有指數價格與溢價指數——是沒有，不是零', async () => {
      const kCandleApplication = buildContractApplication(buildKCandleContractProxy({
        findKCandleContractsInRange: vi.fn().mockResolvedValue([
          buildKCandleContract('2026-08-30T08:00:00.000Z', '100', '110', null),
        ]),
      }))

      const result = await kCandleApplication.searchKCandleContracts(
        new KCandleQueryDto('BTCUSDT', START_TIME))

      expect(result.kCandleContracts[0]?.indexPriceLine).toBeNull()
      expect(result.kCandleContracts[0]?.premiumIndexLine).toBeNull()
    })

    it('只讀合約那一條線：現貨那一條一次都沒被問', async () => {
      const spotProxy = buildProxy()
      const findKCandleContractsInRange = vi.fn().mockResolvedValue([])
      const kCandleApplication = buildContractApplication(
        buildKCandleContractProxy({ findKCandleContractsInRange }), spotProxy)

      await kCandleApplication.searchKCandleContracts(new KCandleQueryDto(' BTCUSDT ', START_TIME))

      expect(spotProxy.findKCandlesInRange).not.toHaveBeenCalled()
      expect(findKCandleContractsInRange.mock.calls[0]?.[0].symbol).toBe('BTCUSDT')
    })

    it('一根都沒有是空的結果，不是錯誤', async () => {
      const kCandleApplication = buildContractApplication(buildKCandleContractProxy())

      const result = await kCandleApplication.searchKCandleContracts(
        new KCandleQueryDto('BTCUSDT', START_TIME))

      expect(result.isEmpty).toBe(true)
    })

    it.each([
      { description: '沒有挑合約', symbol: '', startTime: START_TIME, field: 'symbol', message: '請指定交易標的' },
      { description: '開始時間在未來', symbol: 'BTCUSDT', startTime: FUTURE_TIME, field: 'startTime', message: '開始時間不得晚於目前時間' },
      { description: '開始時間沒填', symbol: 'BTCUSDT', startTime: new Date(Number.NaN), field: 'startTime', message: '請填寫開始時間' },
    ])('$description 時不送出，錯誤標在那一格', async ({ symbol, startTime, field, message }) => {
      const findKCandleContractsInRange = vi.fn()
      const kCandleApplication = buildContractApplication(
        buildKCandleContractProxy({ findKCandleContractsInRange }))

      const failure = await kCandleApplication.searchKCandleContracts(
        new KCandleQueryDto(symbol, startTime)).catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(KCandleQueryValidationError)
      expect((failure as KCandleQueryValidationError).field).toBe(field)
      expect((failure as KCandleQueryValidationError).message).toBe(message)
      expect(findKCandleContractsInRange).not.toHaveBeenCalled()
    })

    it('連不上後端時以連線錯誤往上傳', async () => {
      const kCandleApplication = buildContractApplication(buildKCandleContractProxy({
        findKCandleContractsInRange: vi.fn().mockRejectedValue(new BackendUnreachableError('/contract-k-candles')),
      }))

      await expect(kCandleApplication.searchKCandleContracts(
        new KCandleQueryDto('BTCUSDT', START_TIME))).rejects.toBeInstanceOf(BackendUnreachableError)
    })
  })
})

describe('KCandleApplication 送出前檢查一份草稿', () => {
  const PAST_MINUTE = new Date('2026-09-01T00:00:00Z')

  function draft(open: string, high: string, low: string) {
    return new KCandleWriteDto('BTCUSDT', PAST_MINUTE, open, high, low, '105', '1', '', '', '')
  }

  it.each([
    { name: '合乎規則的草稿沒有問題', open: '100', high: '110', low: '95', issue: null },
    { name: '最高價等於最低價也合乎規則', open: '100', high: '100', low: '100', issue: null },
    { name: '最高價低於最低價落在最高價那一格', open: '100', high: '90', low: '95', issue: { field: 'high', message: '最高價不得低於最低價' } },
    { name: '開盤價沒填落在開盤價那一格', open: '', high: '110', low: '95', issue: { field: 'open', message: '請填寫開盤價' } },
  ])('$name', ({ open, high, low, issue }) => {
    const kCandleApplication = buildApplication(buildProxy())

    const inspected = kCandleApplication.inspectKCandleDraft(draft(open, high, low))

    expect(inspected === null ? null : { field: inspected.field, message: inspected.message }).toEqual(issue)
  })

  it('檢查草稿不送出任何東西', () => {
    const kCandleProxy = buildProxy()

    buildApplication(kCandleProxy).inspectKCandleDraft(draft('100', '90', '95'))

    expect(kCandleProxy.saveKCandle).not.toHaveBeenCalled()
  })
})
