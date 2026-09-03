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
import type { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

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
    ...overrides,
  }
}

function buildApplication(kCandleProxy: IKCandleProxy): KCandleApplication {
  return new KCandleApplication(new KCandleService(kCandleProxy))
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
      }))

      await expect(kCandleApplication.deleteKCandle(new KCandleIdentityDto('BTCUSDT', OPEN_TIME)))
        .rejects.toBeInstanceOf(BackendUnreachableError)
    })
  })
})
