import { describe, expect, it } from 'vitest'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

const WHOLE_SCRIPT = [
  'package main',
  '',
  'import "indicator"',
  '',
  'func Calculate(data []indicator.KCandle) map[string]float64 {',
  '\treturn map[string]float64{"均價": 110}',
  '}',
].join('\n')

/** 要看的那一段。這一份測試不關心它多長，只關心它原封不動地被帶著走。 */
const OBSERVATION_WINDOW = new ObservationWindowVo(
  new Date('2026-09-03T09:00:00.000Z'), new Date('2026-09-03T12:00:00.000Z'))

function buildRequest(
  overrides: {
    symbol?: string
    aggregationInterval?: string
    observationWindow?: ObservationWindowVo
    script?: string
    resultType?: string
  } = {},
) {
  return new IndicatorCalculationRequestDto(
    overrides.symbol ?? 'BTCUSDT',
    overrides.aggregationInterval ?? '5m',
    overrides.observationWindow ?? OBSERVATION_WINDOW,
    overrides.script ?? WHOLE_SCRIPT,
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
      buildRequest({ symbol: '  BTCUSDT  ' }))

    expect(requestDomain.symbol).toBe('BTCUSDT')
    expect(requestDomain.observationWindow).toBe(OBSERVATION_WINDOW)
  })

  it('送出的就是使用者眼前那一整份算式', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(buildRequest())

    expect(requestDomain.script).toBe(WHOLE_SCRIPT)
  })

  it('指標值種類是分開帶著的，不由請求域改算式', () => {
    // 改種類會改進入點那一行的事發生在畫面上；請求域一個字都不碰。
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ resultType: 'boolList' }))

    expect(requestDomain.resultType.value).toBe('boolList')
    expect(requestDomain.script).toBe(WHOLE_SCRIPT)
  })

  it('開頭被使用者刪掉了也照樣送出——寫得對不對由執行的那一方說', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ script: 'func Calculate() {}' }))

    expect(requestDomain.script).toBe('func Calculate() {}')
  })

  it('沒有宣告種類時當作一個數字', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(buildRequest({ resultType: '' }))

    expect(requestDomain.resultType.value).toBe('float')
  })

  it('前後多餘的空白行不影響算式成立，也不會被砍掉', () => {
    const paddedScript = `\n\n${WHOLE_SCRIPT}\n\n`
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ script: paddedScript }))

    expect(requestDomain.script).toBe(paddedScript)
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
    const anotherWindow = new ObservationWindowVo(new Date('2026-09-03T11:00:00.000Z'), null)
    const requestDomain = new IndicatorCalculationRequestDomain(
      buildRequest({ observationWindow: anotherWindow }))

    expect(requestDomain.observationWindow).toBe(anotherWindow)
  })

  it('同時指名一支策略腳本又自帶一段算式時拒絕——說不出實際要跑哪一個', () => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(
      new IndicatorCalculationRequestDto(
        'BTCUSDT', '5m', OBSERVATION_WINDOW, WHOLE_SCRIPT, 'float', [], 7)))

    expect(fieldError.field).toBe('script')
    expect(fieldError.message).toBe('指名一支策略腳本與自帶一段算式只能挑一種')
  })

  it('指名一支策略腳本時不帶算式出去——那一段從頭到尾不離開系統', () => {
    const requestDomain = new IndicatorCalculationRequestDomain(
      new IndicatorCalculationRequestDto(
        'BTCUSDT', '5m', OBSERVATION_WINDOW, '', 'float', [], 7))

    expect(requestDomain.strategyScriptId).toBe(7)
    expect(requestDomain.script).toBe('')
  })

  it.each([
    { description: '完全沒填', script: '' },
    { description: '只有空白字元', script: '  \n  ' },
  ])('算式 $description 時拒絕', ({ script }) => {
    const fieldError = fieldErrorOf(() => new IndicatorCalculationRequestDomain(buildRequest({ script })))

    expect(fieldError.field).toBe('script')
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

    expect(requestDomain.aggregationInterval.value).toBe('1m')
  })
})
