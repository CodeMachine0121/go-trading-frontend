import { describe, expect, it } from 'vitest'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'

function buildRequest(
  overrides: { symbol?: string, candleCount?: string, scriptBody?: string, resultType?: string } = {},
) {
  return new IndicatorCalculationRequestDto(
    overrides.symbol ?? 'BTCUSDT',
    overrides.candleCount ?? '3',
    overrides.scriptBody ?? SCRIPT_BODY,
    overrides.resultType ?? 'float',
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
      buildRequest({ symbol: '  BTCUSDT  ', candleCount: ' 30 ' }))

    expect(requestDomain.symbol).toBe('BTCUSDT')
    expect(requestDomain.candleCount).toBe(30)
  })

  it('送出的是外框夾著內容的一整段算式，不是使用者打的那幾行', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(buildRequest())

    expect(requestDomain.script).toContain('package main')
    expect(requestDomain.script).toContain('func Calculate(data []indicator.KCandle) map[string]float64 {')
    expect(requestDomain.script).toContain(`\t${SCRIPT_BODY}`)
  })

  it('外框跟著指標值種類走', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ resultType: 'boolList', scriptBody: 'return nil' }))

    expect(requestDomain.resultType.value).toBe('boolList')
    expect(requestDomain.script).toContain('map[string][]bool')
  })

  it('沒有宣告種類時當作一個數字', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(buildRequest({ resultType: '' }))

    expect(requestDomain.resultType.value).toBe('float')
    expect(requestDomain.script).toContain('map[string]float64')
  })

  it('內容前後多餘的空白不影響組出來的算式', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ scriptBody: `\n\n  ${SCRIPT_BODY}  \n\n` }))

    expect(requestDomain.script).toContain(`\t${SCRIPT_BODY}`)
    expect(requestDomain.script.split('\n').filter(line => line.trim() !== ''))
      .toHaveLength(9)
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
    { description: '寫成帶小數點的整數', candleCount: '20.0' },
    { description: '帶正號', candleCount: '+20' },
    { description: '指數寫法', candleCount: '1e3' },
    { description: '十六進位寫法', candleCount: '0x10' },
  ])('計算根數是$description 時拒絕，並說是整數的問題', ({ candleCount }) => {
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
    { description: '完全沒填', scriptBody: '' },
    { description: '只有空白字元', scriptBody: '  \n  ' },
  ])('算式內容 $description 時拒絕', ({ scriptBody }) => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ scriptBody })))

    expect(fieldError.field).toBe('scriptBody')
    expect(fieldError.message).toBe('請填寫算式內容')
  })
})
