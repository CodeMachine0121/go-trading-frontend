import { describe, expect, it } from 'vitest'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const SCRIPT = 'package main\nfunc Calculate() {}'

function buildRequest(overrides: { symbol?: string, candleCount?: string, script?: string } = {}) {
  return new IndicatorCalculationRequestDto(
    overrides.symbol ?? 'BTCUSDT',
    overrides.candleCount ?? '3',
    overrides.script ?? SCRIPT,
  )
}

function fieldErrorOf(build: () => IndicatorCalculationRequestDomain): IndicatorCalculationFieldError {
  try {
    build()
  }
  catch (error: unknown) {
    if (error instanceof IndicatorCalculationFieldError) {
      return error
    }
  }

  throw new Error('預期會拋出可修正的欄位錯誤，但沒有')
}

describe('IndicatorCalculationRequestDomain', () => {
  it('條件都合法時，去掉前後空白並把根數解讀成整數', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ symbol: '  BTCUSDT  ', candleCount: ' 30 ', script: `  ${SCRIPT}  ` }))

    expect(requestDomain.symbol).toBe('BTCUSDT')
    expect(requestDomain.candleCount).toBe(30)
    expect(requestDomain.script).toBe(SCRIPT)
  })

  it.each([
    { description: '完全沒填', symbol: '' },
    { description: '只有空白字元', symbol: '   ' },
  ])('交易標的 $description 時拒絕', ({ symbol }) => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ symbol })))

    expect(fieldError.field).toBe('symbol')
    expect(fieldError.message).toBe('請指定交易標的')
  })

  it.each([
    { description: '零', candleCount: '0' },
    { description: '負數', candleCount: '-3' },
  ])('計算根數是$description 時拒絕', ({ candleCount }) => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ candleCount })))

    expect(fieldError.field).toBe('candleCount')
    expect(fieldError.message).toBe('計算根數必須大於零')
  })

  it.each([
    { description: '小數', candleCount: '2.5' },
    { description: '不是數字', candleCount: '三根' },
  ])('計算根數是$description 時拒絕', ({ candleCount }) => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ candleCount })))

    expect(fieldError.field).toBe('candleCount')
    expect(fieldError.message).toBe('計算根數必須是整數')
  })

  it('計算根數留空時拒絕', () => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ candleCount: '  ' })))

    expect(fieldError.field).toBe('candleCount')
    expect(fieldError.message).toBe('請填寫計算根數')
  })

  it('計算根數是一時視為合法', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(buildRequest({ candleCount: '1' }))

    expect(requestDomain.candleCount).toBe(1)
  })

  it.each([
    { description: '完全沒填', script: '' },
    { description: '只有空白字元', script: '  \n  ' },
  ])('算式 $description 時拒絕', ({ script }) => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ script })))

    expect(fieldError.field).toBe('script')
    expect(fieldError.message).toBe('請填寫指標算式')
  })
})
