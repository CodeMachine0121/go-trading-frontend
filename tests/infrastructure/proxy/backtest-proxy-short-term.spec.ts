import Decimal from 'decimal.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BacktestProxy } from '~/infrastructure/proxy/backtest-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { BacktestTimeAllowanceSpentError } from '~/domain/errors/backtest-time-allowance-spent-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import type { FillTiming } from '~/domain/models/vo/fill-timing-vo'
import { ContractBacktestTermsDomain } from '~/domain/models/domains/contract-backtest-terms-domain'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'

const BASE_URL = 'http://localhost:8080'
const START_TIME = new Date('2026-01-01T00:00:00Z')
const END_TIME = new Date('2026-01-31T23:59:00Z')
const VALIDATION_START_TIME = new Date('2026-01-21T00:00:00Z')

function scriptRequestOf(fillTiming: FillTiming, validationStartTime: Date | null): BacktestRequestDomain {
  return new BacktestRequestDomain(new BacktestRequestDto(
    'BTCUSDT', '1h', START_TIME, END_TIME, 'return indicator.Buy', 'signal', [],
    new Decimal('10000'), 'allIn', new Decimal('0'),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0),
    undefined, fillTiming, validationStartTime))
}

function strategyRequestOf(fillTiming: FillTiming, validationStartTime: Date | null) {
  return new TradingStrategyBacktestRequestDomain(new TradingStrategyBacktestRequestDto(
    7, 'BTCUSDT', START_TIME, END_TIME, new Decimal('10000'), 'allIn', new Decimal('0'),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), fillTiming, validationStartTime))
}

function resultWire(startTime: string, endTime: string, extra: Record<string, unknown> = {}) {
  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    startTime,
    endTime,
    usedCandleCount: 2,
    summary: {
      initialCapital: '10000',
      finalEquity: '10500',
      totalReturnRate: 0.05,
      maximumDrawdown: 0.01,
      winRate: 0.5,
      positionOpenCount: 2,
      profitFactor: 2.5,
      expectancy: '75',
      averageHoldingSeconds: 9000,
      maximumConsecutiveLossCount: 1,
      costToGrossProfitRatio: 0.25,
    },
    closedTrades: [],
    equityCurve: [{ openTime: startTime, equity: '10000' }],
    fillTiming: 'nextOpen',
    validationStartTime: null,
    ...extra,
  }
}

function rejectionOf(status: number, message: string, data: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), {
    response: { status },
    data: { message, ...data },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BacktestProxy short-term replays', () => {
  it.each([
    ['重演一支腳本', (proxy: BacktestProxy) => proxy.runBacktest(scriptRequestOf('nextOpen', VALIDATION_START_TIME))],
    ['重演一份交易策略', (proxy: BacktestProxy) => proxy.runTradingStrategyBacktest(
      strategyRequestOf('nextOpen', VALIDATION_START_TIME))],
  ])('%s時送出下一格開盤成交與驗證起點', async (_, run) => {
    const fetchMock = vi.fn().mockResolvedValue(resultWire('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z'))
    vi.stubGlobal('$fetch', fetchMock)

    await run(new BacktestProxy(BASE_URL, signedInSessionStorage()))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body.fillTiming).toBe('nextOpen')
    expect(body.validationStartTime).toBe(VALIDATION_START_TIME.toISOString())
  })

  it('沒動的成交時點與留白的驗證起點不上線', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resultWire('2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z'))
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage()).runBacktest(scriptRequestOf('close', null))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('fillTiming')
    expect(body).not.toHaveProperty('validationStartTime')
  })

  it('讀出五格、成交時點與兩段各自的結果', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(resultWire(
      '2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z', {
        validationStartTime: '2026-01-21T00:00:00Z',
        inSample: resultWire('2026-01-01T00:00:00Z', '2026-01-20T23:00:00Z'),
        validation: resultWire('2026-01-21T00:00:00Z', '2026-01-31T23:00:00Z'),
      })))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runBacktest(scriptRequestOf('nextOpen', VALIDATION_START_TIME))

    expect(backtest.tradeStatistics.profitFactor).toBe(2.5)
    expect(backtest.tradeStatistics.expectancy?.equals(new Decimal(75))).toBe(true)
    expect(backtest.tradeStatistics.averageHoldingSeconds).toBe(9000)
    expect(backtest.tradeStatistics.maximumConsecutiveLossCount).toBe(1)
    expect(backtest.tradeStatistics.costToGrossProfitRatio).toBe(0.25)
    expect(backtest.fillTiming).toBe('nextOpen')
    expect(backtest.validationStartTime).toEqual(VALIDATION_START_TIME)
    expect(backtest.inSample?.endTime).toEqual(new Date('2026-01-20T23:00:00Z'))
    expect(backtest.validation?.startTime).toEqual(new Date('2026-01-21T00:00:00Z'))
  })

  it('比這一刀早的交易服務不說五格時，讀成不適用、連虧零筆、收盤成交、不切分', async () => {
    const olderWire = {
      symbol: 'BTCUSDT',
      interval: '1h',
      startTime: '2026-01-01T00:00:00Z',
      endTime: '2026-01-31T23:00:00Z',
      usedCandleCount: 2,
      summary: {
        initialCapital: '10000',
        finalEquity: '10000',
        totalReturnRate: 0,
        maximumDrawdown: 0,
        winRate: null,
        positionOpenCount: 0,
      },
      closedTrades: [],
      equityCurve: [],
    }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(olderWire))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runBacktest(scriptRequestOf('close', null))

    expect(backtest.tradeStatistics.profitFactor).toBeNull()
    expect(backtest.tradeStatistics.maximumConsecutiveLossCount).toBe(0)
    expect(backtest.fillTiming).toBe('close')
    expect(backtest.inSample).toBeNull()
    expect(backtest.validation).toBeNull()
  })

  it('合約重演也讀得出兩段各自的結果', async () => {
    const contractSummaryExtra = {
      liquidationExitCount: 0,
      totalFundingFee: '0',
      longTradeCount: 0,
      longWinRate: null,
      shortTradeCount: 0,
      shortWinRate: null,
      blockedOpeningCount: 0,
      maintenanceMarginBasis: { kind: 'smallestTier', confirmedAt: null },
    }
    const contractResultWire = (startTime: string, endTime: string, extra: Record<string, unknown> = {}) => {
      const wire = resultWire(startTime, endTime, extra)

      return { ...wire, tradingMode: 'longShort', leverage: '1', summary: { ...wire.summary, ...contractSummaryExtra } }
    }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(contractResultWire(
      '2026-01-01T00:00:00Z', '2026-01-31T23:00:00Z', {
        inSample: contractResultWire('2026-01-01T00:00:00Z', '2026-01-20T23:00:00Z'),
        validation: contractResultWire('2026-01-21T00:00:00Z', '2026-01-31T23:00:00Z'),
      })))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage()).runContractBacktest(
      scriptRequestOf('close', VALIDATION_START_TIME),
      new ContractBacktestTermsDomain(new ContractBacktestTermsDto(new Decimal(0), new Decimal(0), null)))

    expect(backtest.validation?.contractFigures?.tradingMode).toBe('longShort')
    expect(backtest.inSample?.tradeStatistics.profitFactor).toBe(2.5)
  })

  const contractTerms = () => new ContractBacktestTermsDomain(
    new ContractBacktestTermsDto(new Decimal(0), new Decimal(0), null))
  const everyReplay: readonly [string, (proxy: BacktestProxy) => Promise<unknown>][] = [
    ['現貨策略腳本', proxy => proxy.runBacktest(scriptRequestOf('close', null))],
    ['現貨交易策略', proxy => proxy.runTradingStrategyBacktest(strategyRequestOf('close', null))],
    ['合約策略腳本', proxy => proxy.runContractBacktest(scriptRequestOf('close', null), contractTerms())],
    ['合約交易策略', proxy => proxy.runContractTradingStrategyBacktest(
      strategyRequestOf('close', null), contractTerms())],
  ]

  it.each(everyReplay)('%s沒在允許時間內跑完時自成一類，不說成算式的問題', async (_, run) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(
      422, '重演在 90 秒內沒跑完', { timeAllowanceSpent: true })))

    const failure = await run(new BacktestProxy(BASE_URL, signedInSessionStorage())).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BacktestTimeAllowanceSpentError)
    expect(failure).not.toBeInstanceOf(IndicatorScriptFailedError)
    expect((failure as Error).message).toBe('重演在 90 秒內沒跑完')
  })

  it.each(everyReplay)('%s的 422 不帶逾時標記時仍是算式的問題', async (_, run) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(422, '算式第 3 行出錯')))

    const failure = await run(new BacktestProxy(BASE_URL, signedInSessionStorage())).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(IndicatorScriptFailedError)
    expect(failure).not.toBeInstanceOf(BacktestTimeAllowanceSpentError)
  })

  it.each(['validationStartTime', 'fillTiming'] as const)('交易服務指名 %s 時落在那一格', async (field) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(400, '驗證段湊不出任何一格', { field })))

    const failure = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runBacktest(scriptRequestOf('close', VALIDATION_START_TIME)).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe(field)
  })
})
