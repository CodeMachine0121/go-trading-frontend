import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleApplication } from '~/application/k-candle-application'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleService } from '~/domain/service/k-candle-service'
import type { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面，domain service 與 domain model 都是真的——
// 這是刻意的「測試力度放大」（見 .claude/rules/testing.md）。
const START_TIME = new Date('2026-08-30T00:00:00.000Z')
const END_TIME = new Date('2026-08-30T12:00:00.000Z')

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

function buildApplication(kCandleProxy: IKCandleProxy): KCandleApplication {
  return new KCandleApplication(new KCandleService(kCandleProxy))
}

describe('KCandleApplication', () => {
  it('查詢成功時回傳由早到晚、帶漲跌的結果', async () => {
    const kCandleApplication = buildApplication({
      findKCandlesInRange: vi.fn().mockResolvedValue([
        buildKCandle('2026-08-30T10:05:00.000Z', '100', '90'),
        buildKCandle('2026-08-30T10:00:00.000Z', '100', '110'),
      ]),
    })

    const result = await kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
    )

    expect(result.count).toBe(2)
    expect(result.kCandles[0]?.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
    expect(result.kCandles[0]?.trend.value).toBe('up')
    expect(result.kCandles[1]?.trend.value).toBe('down')
  })

  it('查無資料時回傳空結果', async () => {
    const kCandleApplication = buildApplication({
      findKCandlesInRange: vi.fn().mockResolvedValue([]),
    })

    const result = await kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
    )

    expect(result.isEmpty).toBe(true)
    expect(result.count).toBe(0)
  })

  it.each([
    { description: '未指定交易標的', symbol: '', expectedField: 'symbol', expectedMessage: '請指定交易標的' },
    { description: '交易標的只有空白', symbol: '  ', expectedField: 'symbol', expectedMessage: '請指定交易標的' },
  ])('$description 時以可修正的條件錯誤拒絕', async ({ symbol, expectedField, expectedMessage }) => {
    const kCandleApplication = buildApplication({ findKCandlesInRange: vi.fn() })

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto(symbol, START_TIME, END_TIME),
    )).rejects.toThrow(expectedMessage)

    await kCandleApplication.searchKCandles(new KCandleQueryDto(symbol, START_TIME, END_TIME))
      .catch((error: unknown) => {
        expect((error as KCandleQueryValidationError).field).toBe(expectedField)
      })
  })

  it('結束時間早於開始時間時以可修正的條件錯誤拒絕', async () => {
    const kCandleApplication = buildApplication({ findKCandlesInRange: vi.fn() })

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', END_TIME, START_TIME),
    )).rejects.toThrow('結束時間不得早於開始時間')
  })

  it('後端以業務規則拒絕時，原因原封往上傳', async () => {
    const kCandleApplication = buildApplication({
      findKCandlesInRange: vi.fn().mockRejectedValue(
        new BackendRequestRejectedError('時間區間過大，請縮小區間（單次最多 1000 根）'),
      ),
    })

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
    )).rejects.toThrow('時間區間過大，請縮小區間（單次最多 1000 根）')
  })

  it('連不上後端時以連線錯誤往上傳', async () => {
    const kCandleApplication = buildApplication({
      findKCandlesInRange: vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles')),
    })

    await expect(kCandleApplication.searchKCandles(
      new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
    )).rejects.toBeInstanceOf(BackendUnreachableError)
  })
})
