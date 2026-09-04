import { describe, expect, it } from 'vitest'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const SCRIPT_BODY = 'return map[string]float64{"均價": 110}'

function buildRequest(
  overrides: {
    symbol?: string
    aggregationInterval?: string
    candleCount?: number
    scriptBody?: string
    resultType?: string
  } = {},
) {
  return new IndicatorCalculationRequestDto(
    overrides.symbol ?? 'BTCUSDT',
    overrides.aggregationInterval ?? '5m',
    overrides.candleCount ?? 3,
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
  it('條件都合法時，去掉交易標的前後的空白', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ symbol: '  BTCUSDT  ', candleCount: 30 }))

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

  // 「計算根數必須大於零 / 必須是整數」那幾條在這裡消失了，因為**那一格已經不存在**：
  // 使用者說的是「要看多長」，格數由那一段除以彙總刻度得出，天生就是大於零的整數。
  // 這是刻意的行為變更，不是把驗證弄丟了。

  it('只要一格也照常算', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(buildRequest({ candleCount: 1 }))

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

describe('IndicatorCalculationRequestDomain 的彙總刻度', () => {
  it.each([
    { declared: '1h', expected: '1h' },
    { declared: '1D', expected: '1d' },
    { declared: ' 15m ', expected: '15m' },
  ])('宣告 $declared 帶著走的是 $expected', ({ declared, expected }) => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ aggregationInterval: declared }))

    expect(requestDomain.aggregationInterval.value).toBe(expected)
  })

  it.each([
    { name: '完全沒宣告', declared: '' },
    { name: '宣告了認不得的代號', declared: '7m' },
  ])('$name 時退回最細的那一種，而不是拒絕整次計算', ({ declared }) => {
    // 與指標值種類同一套處理：使用者從清單挑，挑不出非法值。
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ aggregationInterval: declared }))

    expect(requestDomain.aggregationInterval.value).toBe('5m')
  })
})
