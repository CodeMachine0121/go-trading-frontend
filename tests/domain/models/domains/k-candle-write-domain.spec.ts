import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleFieldError } from '~/domain/errors/k-candle-field-error'

const CURRENT_TIME = new Date('2026-08-30T12:00:00.000Z')
const VALID_OPEN_TIME = new Date('2026-08-30T09:00:00.000Z')

function buildWriteDto(overrides: Partial<Record<string, string | Date>> = {}): KCandleWriteDto {
  const values = {
    symbol: 'BTCUSDT',
    openTime: VALID_OPEN_TIME,
    open: '100',
    high: '120',
    low: '90',
    close: '110',
    volume: '11',
    quoteVolume: '1200',
    takerBuyBaseVolume: '5',
    takerBuyQuoteVolume: '600',
    ...overrides,
  }

  return new KCandleWriteDto(
    values.symbol as string,
    values.openTime as Date,
    values.open as string,
    values.high as string,
    values.low as string,
    values.close as string,
    values.volume as string,
    values.quoteVolume as string,
    values.takerBuyBaseVolume as string,
    values.takerBuyQuoteVolume as string,
  )
}

function fieldErrorOf(build: () => KCandleWriteDomain): KCandleFieldError {
  try {
    build()
  }
  catch (error: unknown) {
    if (error instanceof KCandleFieldError) {
      return error
    }
  }

  throw new Error('預期會拋出可修正的欄位錯誤，但沒有')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleWriteDomain', () => {
  it('每一欄都合法時，數字成為精確小數、交易標的去掉前後空白', () => {
    const kCandleWriteDomain = new KCandleWriteDomain(buildWriteDto({ symbol: '  BTCUSDT  ', open: '100.5' }))

    expect(kCandleWriteDomain.identity.symbol).toBe('BTCUSDT')
    expect(kCandleWriteDomain.identity.openTime).toEqual(VALID_OPEN_TIME)
    expect(kCandleWriteDomain.open.toString()).toBe('100.5')
    expect(kCandleWriteDomain.takerBuyQuoteVolume.toString()).toBe('600')
  })

  it.each([
    { description: '完全沒填', symbol: '' },
    { description: '只有空白字元', symbol: '   ' },
  ])('交易標的 $description 時拒絕', ({ symbol }) => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ symbol })))

    expect(fieldError.field).toBe('symbol')
    expect(fieldError.message).toBe('請指定交易標的')
  })

  it('起始時間沒填時拒絕', () => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ openTime: new Date('') })))

    expect(fieldError.field).toBe('openTime')
    expect(fieldError.message).toBe('請填寫起始時間')
  })

  it.each([
    { description: '分鐘不在刻度上', openTime: new Date('2026-08-30T09:03:00.000Z') },
    { description: '帶了秒數', openTime: new Date('2026-08-30T09:05:30.000Z') },
    { description: '帶了毫秒', openTime: new Date('2026-08-30T09:05:00.500Z') },
  ])('起始時間 $description 時拒絕', ({ openTime }) => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ openTime })))

    expect(fieldError.field).toBe('openTime')
    expect(fieldError.message).toBe('起始時間必須落在5分鐘刻度上')
  })

  it('起始時間指向未來時拒絕', () => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(
      buildWriteDto({ openTime: new Date('2026-08-30T12:05:00.000Z') })))

    expect(fieldError.field).toBe('openTime')
    expect(fieldError.message).toBe('起始時間不得指向未來')
  })

  it('起始時間正好是目前這一刻時視為合法', () => {
    const kCandleWriteDomain = new KCandleWriteDomain(buildWriteDto({ openTime: CURRENT_TIME }))

    expect(kCandleWriteDomain.identity.openTime).toEqual(CURRENT_TIME)
  })

  it('最高價低於最低價時拒絕', () => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ high: '90', low: '100' })))

    expect(fieldError.field).toBe('high')
    expect(fieldError.message).toBe('最高價不得低於最低價')
  })

  it('最高價與最低價相同時視為合法', () => {
    const kCandleWriteDomain = new KCandleWriteDomain(buildWriteDto({ high: '100', low: '100' }))

    expect(kCandleWriteDomain.high.toString()).toBe('100')
  })

  it.each([
    { field: 'open', label: '開盤價' },
    { field: 'high', label: '最高價' },
    { field: 'low', label: '最低價' },
    { field: 'close', label: '收盤價' },
    { field: 'volume', label: '成交量' },
    { field: 'quoteVolume', label: '成交額' },
    { field: 'takerBuyBaseVolume', label: '主動買入量' },
    { field: 'takerBuyQuoteVolume', label: '主動買入額' },
  ])('$label 留空時拒絕並指名該欄位', ({ field, label }) => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ [field]: '  ' })))

    expect(fieldError.field).toBe(field)
    expect(fieldError.message).toBe(`請填寫${label}`)
  })

  it.each([
    { rawValue: '一百' },
    { rawValue: 'abc' },
    { rawValue: '1,000' },
  ])('收盤價填成「$rawValue」時拒絕', ({ rawValue }) => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ close: rawValue })))

    expect(fieldError.field).toBe('close')
    expect(fieldError.message).toBe('收盤價必須是數字')
  })

  it.each([
    { description: '很小的數字', volume: '1e-8' },
    { description: '很大的數字', volume: '1.23e+22' },
    { description: '大寫的指數符號', volume: '1E-8' },
  ])('成交量是$description（指數表示法）時視為合法', ({ volume }) => {
    // 精確小數型別本身就會把這種值輸出成指數形式，修改既有 K 線時表單帶入的就是它。
    const kCandleWriteDomain = new KCandleWriteDomain(buildWriteDto({ volume }))

    expect(kCandleWriteDomain.volume.isNegative()).toBe(false)
  })

  it('價量為負時拒絕並指名該欄位', () => {
    const fieldError = fieldErrorOf(() => new KCandleWriteDomain(buildWriteDto({ volume: '-1' })))

    expect(fieldError.field).toBe('volume')
    expect(fieldError.message).toBe('價格與成交數字不得為負數')
  })

  it.each([
    { description: '零', volume: '0' },
    { description: '小數', volume: '0.5' },
    { description: '沒有整數部分的小數', volume: '.5' },
  ])('成交量是$description 時視為合法', ({ volume }) => {
    const kCandleWriteDomain = new KCandleWriteDomain(buildWriteDto({ volume }))

    expect(kCandleWriteDomain.volume.isNegative()).toBe(false)
  })
})
