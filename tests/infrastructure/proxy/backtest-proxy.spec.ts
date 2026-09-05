import Decimal from 'decimal.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BacktestProxy } from '~/infrastructure/proxy/backtest-proxy'
import { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'

const BASE_URL = 'http://localhost:8080'
const SCRIPT_BODY = 'return map[string]float64{"signal": 1}'
const START_TIME = new Date('2026-08-06T00:00:00Z')
const END_TIME = new Date('2026-09-04T23:59:59Z')

function requestOf(parameters: StrategyParameterDto[] = []): BacktestRequestDomain {
  return new BacktestRequestDomain(new BacktestRequestDto(
    'BTCUSDT', '1h', START_TIME, END_TIME, SCRIPT_BODY, parameters,
    new Decimal('10000'), 'percentage', new Decimal('50')))
}

/** 一次成功的回測，wire 上的樣子。金額一律是字串——它們是精確小數。 */
function completedWire() {
  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    startTime: '2026-08-06T00:00:00Z',
    endTime: '2026-09-04T23:00:00Z',
    usedCandleCount: 2,
    summary: {
      initialCapital: '10000',
      finalEquity: '12500',
      totalReturnRate: 0.25,
      maximumDrawdown: 0.1,
      winRate: 0.75,
      positionOpenCount: 4,
    },
    closedTrades: [{
      direction: 'long',
      entryTime: '2026-08-06T00:00:00Z',
      entryPrice: '100.5',
      exitTime: '2026-08-07T00:00:00Z',
      exitPrice: '110.25',
      stake: '10000',
      profit: '970.14',
    }],
    equityCurve: [{ openTime: '2026-08-06T00:00:00Z', equity: '10000.123456789012345678' }],
  }
}

function rejectionOf(status: number, message: string, named?: {
  parameterName?: string
  field?: string
}) {
  return Object.assign(new Error(message), {
    response: { status },
    data: { message, ...named },
  })
}

async function backtestFailure(): Promise<unknown> {
  try {
    await new BacktestProxy(BASE_URL).runBacktest(requestOf())
  }
  catch (error: unknown) {
    return error
  }

  throw new Error('這次回測應該要失敗才對')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BacktestProxy', () => {
  it('把每一項條件都送到回測端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL).runBacktest(requestOf())

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/backtests`,
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          symbol: 'BTCUSDT',
          aggregationInterval: '1h',
          startTime: START_TIME.toISOString(),
          endTime: END_TIME.toISOString(),
          initialCapital: '10000',
          positionSizingMode: 'percentage',
          positionSizingValue: '50',
        }),
      }))
  })

  it('金額以字串送出去，不經過浮點數', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL).runBacktest(requestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(typeof body.initialCapital).toBe('string')
    expect(typeof body.positionSizingValue).toBe('string')
  })

  it('宣告與這一次的值分兩份送，空的也送', async () => {
    // 「一個都沒宣告」與「忘了送」在收的那一端長得一模一樣。
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL).runBacktest(requestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.parameters).toEqual([])
    expect(body.parameterValues).toEqual([])
  })

  it('宣告過的旋鈕兩份都帶著', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL).runBacktest(
      requestOf([new StrategyParameterDto('period', 'lookbackCount', 20)]))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.parameters).toEqual([{ name: 'period', kind: 'lookbackCount', defaultValue: 20 }])
    expect(body.parameterValues).toEqual([{ name: 'period', value: 20 }])
  })

  it('把回來的東西正規化成 entity，金額不失精度', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(completedWire()))

    const backtest = await new BacktestProxy(BASE_URL).runBacktest(requestOf())

    expect(backtest.symbol).toBe('BTCUSDT')
    expect(backtest.winRate).toBe(0.75)
    expect(backtest.closedTrades[0]!.entryPrice.toString()).toBe('100.5')
    expect(backtest.closedTrades[0]!.profit.toString()).toBe('970.14')
    expect(backtest.equityCurve[0]!.equity.toString()).toBe('10000.123456789012345678')
    expect(backtest.equityCurve[0]!.openTime).toEqual(new Date('2026-08-06T00:00:00Z'))
  })

  it('一筆都沒平倉時勝率留成沒有值，不變成零', async () => {
    // 那是後端刻意說的兩件不同的事；存成 0 會讓分別在進 domain 的第一步消失。
    const wire = completedWire()
    wire.summary.winRate = null as unknown as number
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(wire))

    const backtest = await new BacktestProxy(BASE_URL).runBacktest(requestOf())

    expect(backtest.winRate).toBeNull()
  })

  it('沒有交易也沒有曲線時收成空清單，不是失敗', async () => {
    const wire = { ...completedWire(), closedTrades: null, equityCurve: null }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(wire))

    const backtest = await new BacktestProxy(BASE_URL).runBacktest(requestOf())

    expect(backtest.closedTrades).toEqual([])
    expect(backtest.equityCurve).toEqual([])
  })

  it('名字對不上時指名那個旋鈕，而不是說算式壞了', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '算式取用了參數 "期數"', { parameterName: '期數' })))

    const failure = await backtestFailure()

    expect(failure).toBeInstanceOf(StrategyParameterNotDeclaredError)
    expect((failure as StrategyParameterNotDeclaredError).parameterName).toBe('期數')
  })

  it('算式跑不起來時說成算式的問題', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(422, '算式執行失敗')))

    expect(await backtestFailure()).toBeInstanceOf(IndicatorScriptFailedError)
  })

  it.each([
    ['timeRange', 'timeRange'],
    ['initialCapital', 'initialCapital'],
    ['positionSizingValue', 'positionSizingValue'],
  ])('後端指名 %s 時，說明落在那一格旁邊', async (backendField, expectedField) => {
    // 判準是回應帶回來的那個欄位，不是訊息的文字：文字是寫給人看的。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '這一段重演不了', { field: backendField })))

    const failure = await backtestFailure()

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe(expectedField)
  })

  it('後端指名一個這個畫面認不得的名字時，退回一般的拒絕', async () => {
    // 標在錯的一格旁邊，比標在頁面頂端更糟。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '某個新欄位有問題', { field: 'somethingNew' })))

    const failure = await backtestFailure()

    expect(failure).not.toBeInstanceOf(BacktestFieldError)
    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
  })

  it('沒有指名任何一格的拒絕就是一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(400, '請求有問題')))

    const failure = await backtestFailure()

    expect(failure).not.toBeInstanceOf(BacktestFieldError)
    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
  })
})
