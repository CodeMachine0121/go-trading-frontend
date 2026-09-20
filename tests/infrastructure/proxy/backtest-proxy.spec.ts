import Decimal from 'decimal.js'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BacktestProxy } from '~/infrastructure/proxy/backtest-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { StrategyScriptParameterNotDeclaredError } from '~/domain/errors/strategy-script-parameter-not-declared-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'

const BASE_URL = 'http://localhost:8080'
const SCRIPT_BODY = 'return indicator.Buy'
const START_TIME = new Date('2026-08-06T00:00:00Z')
const END_TIME = new Date('2026-09-04T23:59:59Z')

function requestOf(
  parameters: StrategyScriptParameterDto[] = [],
  tradingMode: TradingMode = 'longShort',
  // 留白就是不模擬，也就是這一刀之前的每一次重演。
  stopLossPercentage = new Decimal(0),
  takeProfitPercentage = new Decimal(0),
  // 留白就是不收費，也就是這一刀之前的每一次重演。
  entryCostPercentage = new Decimal(0),
  exitCostPercentage = new Decimal(0),
): BacktestRequestDomain {
  return new BacktestRequestDomain(new BacktestRequestDto(
    'BTCUSDT', '1h', START_TIME, END_TIME, SCRIPT_BODY, 'signal', parameters,
    new Decimal('10000'), 'percentage', new Decimal('50'), tradingMode,
    stopLossPercentage, takeProfitPercentage,
    entryCostPercentage, exitCostPercentage))
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
    } as {
      initialCapital: string
      finalEquity: string
      totalReturnRate: number
      maximumDrawdown: number
      winRate: number | null
      positionOpenCount: number
      stopLossExitCount?: number
      takeProfitExitCount?: number
      totalTransactionCost?: string
    },
    closedTrades: [{
      direction: 'long',
      entryTime: '2026-08-06T00:00:00Z',
      entryPrice: '100.5',
      exitTime: '2026-08-07T00:00:00Z',
      exitPrice: '110.25',
      stake: '10000',
      profit: '970.14',
    }] as {
      direction: string
      entryTime: string
      entryPrice: string
      exitTime: string
      exitPrice: string
      stake: string
      profit: string
      exitReason?: string
      entryCost?: string
      exitCost?: string
    }[],
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
    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())
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

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

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

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(typeof body.initialCapital).toBe('string')
    expect(typeof body.positionSizingValue).toBe('string')
  })

  it('填了的出場距離以字串送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(
      requestOf([], 'longShort', new Decimal('2'), new Decimal('5')))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.stopLossPercentage).toBe('2')
    expect(body.takeProfitPercentage).toBe('5')
  })

  it('留白的出場距離**根本不出現在請求裡**', async () => {
    // 送一個零雖然等價（後端把零讀成「沒有這個出場」），
    // 但那個等價是巧合：一個空輸入框轉成的零不是使用者的意思。
    // 不送它，「留白就不模擬」在線上就是字面的意思。
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('stopLossPercentage')
    expect(body).not.toHaveProperty('takeProfitPercentage')
  })

  it('只填一個就只送那一個', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(
      requestOf([], 'longShort', new Decimal('2'), new Decimal(0)))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.stopLossPercentage).toBe('2')
    expect(body).not.toHaveProperty('takeProfitPercentage')
  })

  it('填了的費率以字串送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(
      requestOf([], 'longShort', new Decimal(0), new Decimal(0),
        new Decimal('0.0855'), new Decimal('0.3855')))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.entryCostPercentage).toBe('0.0855')
    expect(body.exitCostPercentage).toBe('0.3855')
  })

  it('留白的費率**根本不出現在請求裡**', async () => {
    // 與出場距離一字不差的理由：一個空輸入框轉成的零不是使用者的意思。
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('entryCostPercentage')
    expect(body).not.toHaveProperty('exitCostPercentage')
  })

  it('只填進場那一格就只送那一格——出場由後端沿用它', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(
      requestOf([], 'longShort', new Decimal(0), new Decimal(0), new Decimal('0.1')))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.entryCostPercentage).toBe('0.1')
    expect(body).not.toHaveProperty('exitCostPercentage')
  })

  it('讀回來的那一份說得出總共付了多少、每一筆付了多少', async () => {
    const wire = completedWire()
    wire.summary.totalTransactionCost = '210'
    wire.closedTrades[0]!.entryCost = '100'
    wire.closedTrades[0]!.exitCost = '110'
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(wire))

    const backtest = await new BacktestProxy(
      BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(backtest.totalTransactionCost.toString()).toBe('210')
    expect(backtest.closedTrades[0]!.entryCost.toString()).toBe('100')
    expect(backtest.closedTrades[0]!.exitCost.toString()).toBe('110')
  })

  it('沒說成本時一律當成零', async () => {
    // 比這一刀早的後端從來不收費，也不說這三件事。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(completedWire()))

    const backtest = await new BacktestProxy(
      BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(backtest.totalTransactionCost.isZero()).toBe(true)
    expect(backtest.closedTrades[0]!.entryCost.isZero()).toBe(true)
    expect(backtest.closedTrades[0]!.exitCost.isZero()).toBe(true)
  })

  it('後端指名交易成本時，說明落在那一組旁邊', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400, 'backtest validation failed: 進場成本率不得為負',
      { field: 'transactionCosts' })))

    const failure = await backtestFailure()

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe('transactionCosts')
  })

  it('讀回來的那一份說得出幾筆是被掃出場的、以及每一筆怎麼出場', async () => {
    const wire = completedWire()
    wire.summary.stopLossExitCount = 2
    wire.summary.takeProfitExitCount = 1
    wire.closedTrades[0]!.exitReason = 'stopLoss'
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(wire))

    const backtest = await new BacktestProxy(
      BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(backtest.stopLossExitCount).toBe(2)
    expect(backtest.takeProfitExitCount).toBe(1)
    expect(backtest.closedTrades[0]!.exitReason).toBe('stopLoss')
  })

  it('沒說出場原因時當成訊號出場，兩個筆數當成零', async () => {
    // 比這一刀早的後端不說這三件事，而那時每一筆都只可能是訊號出場。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(completedWire()))

    const backtest = await new BacktestProxy(
      BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(backtest.stopLossExitCount).toBe(0)
    expect(backtest.takeProfitExitCount).toBe(0)
    expect(backtest.closedTrades[0]!.exitReason).toBe('signal')
  })

  it('後端指名出場價位時，說明落在那一組旁邊', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400, 'backtest validation failed: 停損距離不得為負',
      { field: 'exitLevels' })))

    const failure = await backtestFailure()

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe('exitLevels')
  })

  it('宣告與這一次的值分兩份送，空的也送', async () => {
    // 「一個都沒宣告」與「忘了送」在收的那一端長得一模一樣。
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.parameters).toEqual([])
    expect(body.parameterValues).toEqual([])
  })

  it('宣告過的旋鈕兩份都帶著', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(
      requestOf([new StrategyScriptParameterDto('period', 'lookbackCount', 20)]))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.parameters).toEqual([{ name: 'period', kind: 'lookbackCount', defaultValue: 20 }])
    expect(body.parameterValues).toEqual([{ name: 'period', value: 20 }])
  })

  it('把回來的東西正規化成 entity，金額不失精度', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(completedWire()))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

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

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(backtest.winRate).toBeNull()
  })

  it('沒有交易也沒有曲線時收成空清單，不是失敗', async () => {
    const wire = { ...completedWire(), closedTrades: null, equityCurve: null }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(wire))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(backtest.closedTrades).toEqual([])
    expect(backtest.equityCurve).toEqual([])
  })

  it('名字對不上時指名那個旋鈕，而不是說算式壞了', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      rejectionOf(400, '算式取用了參數 "期數"', { parameterName: '期數' })))

    const failure = await backtestFailure()

    expect(failure).toBeInstanceOf(StrategyScriptParameterNotDeclaredError)
    expect((failure as StrategyScriptParameterNotDeclaredError).parameterName).toBe('期數')
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

function tradingStrategyRequestOf(): TradingStrategyBacktestRequestDomain {
  return new TradingStrategyBacktestRequestDomain(new TradingStrategyBacktestRequestDto(
    7, 'BTCUSDT', START_TIME, END_TIME,
    new Decimal('10000'), 'percentage', new Decimal('50'), new Decimal(0), new Decimal(0),
    new Decimal(0), new Decimal(0)))
}

async function tradingStrategyBacktestFailure(): Promise<unknown> {
  try {
    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runTradingStrategyBacktest(tradingStrategyRequestOf())
  }
  catch (error: unknown) {
    return error
  }

  throw new Error('這次重演應該要失敗才對')
}

describe('BacktestProxy 重演一整份交易策略', () => {
  it('打的是那一份底下的重演端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runTradingStrategyBacktest(tradingStrategyRequestOf())

    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE_URL}/trading-strategies/7/backtests`)
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST')
  })

  it('送出去的沒有彙總刻度，也沒有算式', async () => {
    // 那兩樣是那份交易策略自己說的。順手送過去的話，同一件事就有兩個答案。
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runTradingStrategyBacktest(tradingStrategyRequestOf())

    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('aggregationInterval')
    expect(body).not.toHaveProperty('script')
    expect(body).not.toHaveProperty('parameters')
    expect(body.symbol).toBe('BTCUSDT')
    // 金額以字串送出：它是精確小數，經過浮點數就再也回不來了。
    expect(body.initialCapital).toBe('10000')
    expect(body.positionSizingValue).toBe('50')
  })

  it('讀回來的那一份說得出打架了幾棒', async () => {
    const wire = completedWire()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(
      { ...wire, summary: { ...wire.summary, conflictedCandleCount: 180 } }))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runTradingStrategyBacktest(tradingStrategyRequestOf())

    expect(backtest.conflictedCandleCount).toBe(180)
  })

  it('沒有那一項時當成一棒都沒打架過', async () => {
    // 單獨重演一支策略腳本從來不會打架，後端那一邊也就不說這件事。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(completedWire()))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runTradingStrategyBacktest(tradingStrategyRequestOf())

    expect(backtest.conflictedCandleCount).toBe(0)
  })

  it('後端說來源對不起來時，說明落在市場那一格旁邊', async () => {
    // 畫面上沒有「信號來源」那一格可以標——市場是這張表單上唯一與
    // 「要重演什麼」有關的地方。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      400, '這一份交易策略的信號來源目前用了 1h、5m 這幾種彙總刻度',
      { field: 'signalSources' })))

    const failure = await tradingStrategyBacktestFailure()

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe('symbol')
  })

  it('算式跑不起來時說成算式的問題', async () => {
    // 一份交易策略裡任何一支腳本壞了都走同一條路，訊息由後端指名是哪一支。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(422, '算式執行失敗')))

    expect(await tradingStrategyBacktestFailure()).toBeInstanceOf(IndicatorScriptFailedError)
  })
})

describe('BacktestProxy 照哪一套規矩操作', () => {
  it('挑了什麼就送什麼', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runBacktest(requestOf([], 'spot'))

    expect(fetchMock.mock.calls[0]![1].body.tradingMode).toBe('spot')
  })

  it('沒有動過它就送既有的那一種', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(requestOf())

    expect(fetchMock.mock.calls[0]![1].body.tradingMode).toBe('longShort')
  })

  it('重演一整份交易策略時不送刻度、算式與交易模式', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completedWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runTradingStrategyBacktest(tradingStrategyRequestOf())

    const body = fetchMock.mock.calls[0]![1].body
    // 那三樣都是這份交易策略自己說的，多送一份等於同一件事有兩個答案。
    expect(body.aggregationInterval).toBeUndefined()
    expect(body.script).toBeUndefined()
    expect(body.tradingMode).toBeUndefined()
  })

  it('後端說交易模式不對時，那句話標在交易模式那一格', async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      rejectionOf(400, '交易模式只能是 longShort、spot 其中之一', { field: 'tradingMode' }))
    vi.stubGlobal('$fetch', fetchMock)

    const failure = await backtestFailure()

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe('tradingMode')
    // 使用者要看到有哪兩種可挑，才知道自己該改成什麼。
    expect((failure as BacktestFieldError).message).toContain('longShort')
    expect((failure as BacktestFieldError).message).toContain('spot')
  })

  it('後端拒絕的是別的東西時，交易模式那一格不會被牽連', async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      rejectionOf(400, '初始資金必須大於零', { field: 'initialCapital' }))
    vi.stubGlobal('$fetch', fetchMock)

    const failure = await backtestFailure()

    expect((failure as BacktestFieldError).field).toBe('initialCapital')
  })
})
