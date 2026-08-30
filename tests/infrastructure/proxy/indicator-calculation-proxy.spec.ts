import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const BASE_URL = 'http://localhost:8080'
const SCRIPT = 'package main\nfunc Calculate() {}'
const REQUEST = new IndicatorCalculationRequestDomain(
  new IndicatorCalculationRequestDto('BTCUSDT', '3', SCRIPT))

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IndicatorCalculationProxy', () => {
  it('把交易標的、根數與算式送到指標計算端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ symbol: 'BTCUSDT', usedCandleCount: 3, values: {} })
    vi.stubGlobal('$fetch', fetchMock)

    await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/indicator-calculations', {
      method: 'POST',
      body: { symbol: 'BTCUSDT', candleCount: 3, script: SCRIPT },
    })
  })

  it('把回來的指標攤成一組名稱與數值', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT',
      usedCandleCount: 4,
      values: { 均價: 110, 最高: 120 },
    }))

    const indicatorCalculation = await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(indicatorCalculation.usedCandleCount).toBe(4)
    expect(indicatorCalculation.indicatorValues).toHaveLength(2)
    expect(indicatorCalculation.indicatorValues.map(indicatorValue => indicatorValue.name).sort())
      .toEqual(['均價', '最高'])
  })

  it.each([
    { description: '回傳空的一組指標', values: {} },
    { description: '整個沒有指標這一段', values: null },
  ])('$description 時仍是一次成功的計算', async ({ values }) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', usedCandleCount: 3, values,
    }))

    const indicatorCalculation = await new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    expect(indicatorCalculation.indicatorValues).toHaveLength(0)
    expect(indicatorCalculation.usedCandleCount).toBe(3)
  })

  it('算式跑不起來時，翻譯成「算式的問題」', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 422, message: '算式無法解讀：expected }, found EOF' })))

    const calculate = new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    await expect(calculate).rejects.toBeInstanceOf(IndicatorScriptFailedError)
    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toThrow('算式無法解讀：expected }, found EOF')
  })

  it('請求本身有問題時，維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: 'K 線不足，排除最新一根後目前可用 9 根，但要求 30 根' })))

    const calculate = new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST)

    await expect(calculate).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toThrow('K 線不足，排除最新一根後目前可用 9 根，但要求 30 根')
  })

  it('連不上後端時維持連線錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new IndicatorCalculationProxy(BASE_URL).calculateIndicator(REQUEST))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})
