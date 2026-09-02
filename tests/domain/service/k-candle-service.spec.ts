import Decimal from 'decimal.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleIdentityDto } from '~/domain/models/dto/k-candle-identity-dto'
import { KCandleFieldError } from '~/domain/errors/k-candle-field-error'
import { KCandleService } from '~/domain/service/k-candle-service'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

const START_TIME = new Date('2026-08-30T00:00:00.000Z')
const END_TIME = new Date('2026-08-30T12:00:00.000Z')

function buildKCandle(openTime: string): KCandle {
  return new KCandle(
    'BTCUSDT',
    new Date(openTime),
    new Decimal('100'),
    new Decimal('120'),
    new Decimal('90'),
    new Decimal('110'),
    new Decimal('11'),
    new Decimal('1200'),
    new Decimal('5'),
    new Decimal('600'),
  )
}

function buildProxy(kCandles: KCandle[]): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn().mockResolvedValue(kCandles),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
  }
}

describe('KCandleService', () => {
  describe('searchKCandles', () => {
    it('把取回的 K 線由新到舊排好，並算出筆數', async () => {
      const kCandleService = new KCandleService(buildProxy([
        buildKCandle('2026-08-30T10:10:00.000Z'),
        buildKCandle('2026-08-30T10:00:00.000Z'),
        buildKCandle('2026-08-30T10:05:00.000Z'),
      ]))

      const result = await kCandleService.searchKCandles(
        new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
      )

      expect(result.kCandles.map(kCandle => kCandle.openTime.toISOString())).toEqual([
        '2026-08-30T10:10:00.000Z',
        '2026-08-30T10:05:00.000Z',
        '2026-08-30T10:00:00.000Z',
      ])
      expect(result.count).toBe(3)
      expect(result.isEmpty).toBe(false)
    })

    it('只有一根時筆數為 1', async () => {
      const kCandleService = new KCandleService(buildProxy([buildKCandle('2026-08-30T10:00:00.000Z')]))

      const result = await kCandleService.searchKCandles(
        new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
      )

      expect(result.count).toBe(1)
      expect(result.isEmpty).toBe(false)
    })

    it('一根都沒有時回傳空結果而不是錯誤', async () => {
      const kCandleService = new KCandleService(buildProxy([]))

      const result = await kCandleService.searchKCandles(
        new KCandleQueryDto('BTCUSDT', START_TIME, END_TIME),
      )

      expect(result.count).toBe(0)
      expect(result.isEmpty).toBe(true)
    })

    it('條件不合法時完全不去取資料', async () => {
      const kCandleProxy = buildProxy([])
      const kCandleService = new KCandleService(kCandleProxy)

      await expect(kCandleService.searchKCandles(
        new KCandleQueryDto('', START_TIME, END_TIME),
      )).rejects.toBeInstanceOf(KCandleQueryValidationError)
      expect(kCandleProxy.findKCandlesInRange).not.toHaveBeenCalled()
    })

    it('交給取資料的條件是正規化後的交易標的', async () => {
      const kCandleProxy = buildProxy([])
      const kCandleService = new KCandleService(kCandleProxy)

      await kCandleService.searchKCandles(new KCandleQueryDto('  BTCUSDT  ', START_TIME, END_TIME))

      expect(kCandleProxy.findKCandlesInRange).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'BTCUSDT', startTime: START_TIME, endTime: END_TIME }),
      )
    })
  })

  describe('buildDefaultQuery', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('預設區間為目前時間往前二十四小時到目前時間', () => {
      const kCandleService = new KCandleService(buildProxy([]))

      const defaultQuery = kCandleService.buildDefaultQuery('BTCUSDT')

      expect(defaultQuery.symbol).toBe('BTCUSDT')
      expect(defaultQuery.startTime.toISOString()).toBe('2026-08-29T12:00:00.000Z')
      expect(defaultQuery.endTime.toISOString()).toBe('2026-08-30T12:00:00.000Z')
    })
  })

  describe('寫入用例', () => {
    const VALID_OPEN_TIME = new Date('2026-08-30T09:00:00.000Z')

    function buildWriteDto(symbol = 'BTCUSDT'): KCandleWriteDto {
      return new KCandleWriteDto(symbol, VALID_OPEN_TIME, '100', '120', '90', '110', '11', '1200', '5', '600')
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('新增時把驗證過的 K 線交出去，並回傳存下來的那一根', async () => {
      const kCandleProxy = buildProxy([])
      kCandleProxy.saveKCandle = vi.fn().mockResolvedValue(buildKCandle('2026-08-30T09:00:00.000Z'))
      const kCandleService = new KCandleService(kCandleProxy)

      const savedKCandle = await kCandleService.saveKCandle(buildWriteDto())

      expect(kCandleProxy.saveKCandle).toHaveBeenCalledWith(expect.objectContaining({
        identity: expect.objectContaining({ symbol: 'BTCUSDT', openTime: VALID_OPEN_TIME }),
      }))
      expect(savedKCandle.symbol).toBe('BTCUSDT')
      expect(savedKCandle.trend.value).toBe('up')
    })

    it('修改時把驗證過的 K 線交出去，並回傳更新後的那一根', async () => {
      const kCandleProxy = buildProxy([])
      kCandleProxy.updateKCandle = vi.fn().mockResolvedValue(buildKCandle('2026-08-30T09:00:00.000Z'))
      const kCandleService = new KCandleService(kCandleProxy)

      const updatedKCandle = await kCandleService.updateKCandle(buildWriteDto())

      expect(kCandleProxy.updateKCandle).toHaveBeenCalledTimes(1)
      expect(updatedKCandle.close.toString()).toBe('110')
    })

    it.each([
      { useCase: '新增', run: (service: KCandleService) => service.saveKCandle(buildWriteDto('')) },
      { useCase: '修改', run: (service: KCandleService) => service.updateKCandle(buildWriteDto('')) },
    ])('$useCase 的輸入不合法時完全不去寫入', async ({ run }) => {
      const kCandleProxy = buildProxy([])
      const kCandleService = new KCandleService(kCandleProxy)

      await expect(run(kCandleService)).rejects.toBeInstanceOf(KCandleFieldError)
      expect(kCandleProxy.saveKCandle).not.toHaveBeenCalled()
      expect(kCandleProxy.updateKCandle).not.toHaveBeenCalled()
    })

    it('刪除時以驗證過的身分指名那一根', async () => {
      const kCandleProxy = buildProxy([])
      const kCandleService = new KCandleService(kCandleProxy)

      await kCandleService.deleteKCandle(new KCandleIdentityDto('  BTCUSDT  ', VALID_OPEN_TIME))

      expect(kCandleProxy.deleteKCandle).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'BTCUSDT', openTime: VALID_OPEN_TIME }),
      )
    })

    it('刪除時身分不完整就完全不去刪', async () => {
      const kCandleProxy = buildProxy([])
      const kCandleService = new KCandleService(kCandleProxy)

      await expect(kCandleService.deleteKCandle(new KCandleIdentityDto('', VALID_OPEN_TIME)))
        .rejects.toBeInstanceOf(KCandleFieldError)
      expect(kCandleProxy.deleteKCandle).not.toHaveBeenCalled()
    })
  })
})
