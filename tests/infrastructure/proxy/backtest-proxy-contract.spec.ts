import Decimal from 'decimal.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BacktestProxy } from '~/infrastructure/proxy/backtest-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { ContractBacktestTermsDomain } from '~/domain/models/domains/contract-backtest-terms-domain'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

const BASE_URL = 'http://localhost:8080'
const START_TIME = new Date('2026-08-06T00:00:00Z')
const END_TIME = new Date('2026-09-04T23:59:59Z')

function scriptRequest(): BacktestRequestDomain {
  return new BacktestRequestDomain(new BacktestRequestDto(
    'BTCUSDT', '1h', START_TIME, END_TIME, 'return indicator.Buy', 'signal', [],
    new Decimal('10000'), 'allIn', new Decimal(0),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0)))
}

function tradingStrategyRequest(): TradingStrategyBacktestRequestDomain {
  return new TradingStrategyBacktestRequestDomain(new TradingStrategyBacktestRequestDto(
    7, 'BTCUSDT', START_TIME, END_TIME, new Decimal('10000'), 'allIn', new Decimal(0),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0)))
}

function termsOf(
  leverage: string, slippagePercentage: string, tradingMode: ContractTradingMode | null,
): ContractBacktestTermsDomain {
  return new ContractBacktestTermsDomain(new ContractBacktestTermsDto(
    new Decimal(leverage), new Decimal(slippagePercentage), tradingMode))
}

/** 一次合約重演回來的樣子：一筆被強平的五倍空單。 */
function contractWire() {
  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    tradingMode: 'shortOnly',
    leverage: '5',
    startTime: '2026-08-06T00:00:00Z',
    endTime: '2026-09-04T23:00:00Z',
    usedCandleCount: 2,
    summary: {
      initialCapital: '10000',
      finalEquity: '0',
      totalReturnRate: -1,
      maximumDrawdown: 1,
      winRate: 0,
      positionOpenCount: 1,
      stopLossExitCount: 0,
      takeProfitExitCount: 0,
      totalTransactionCost: '0',
      conflictedCandleCount: 0,
      liquidationExitCount: 1,
      totalFundingFee: '-5',
      longTradeCount: 0,
      longWinRate: null,
      shortTradeCount: 1,
      shortWinRate: 0,
      blockedOpeningCount: 2,
      maintenanceMarginBasis: { kind: 'tiers', confirmedAt: '2026-09-01T00:00:00Z' },
    },
    closedTrades: [{
      direction: 'short',
      entryTime: '2026-08-06T00:00:00Z',
      entryPrice: '100',
      exitTime: '2026-08-06T01:00:00Z',
      exitPrice: '119.5',
      leverage: '5',
      quantity: '500',
      margin: '10000',
      entryCost: '0',
      exitCost: '0',
      fundingFee: '-5',
      profit: '-10000',
      exitReason: 'liquidation',
    }],
    equityCurve: [{ openTime: '2026-08-06T00:00:00Z', equity: '10000' }],
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BacktestProxy 的合約重演', () => {
  it('一支合約策略腳本送到合約重演的入口，帶著槓桿、滑點與交易模式', async () => {
    const fetchMock = vi.fn().mockResolvedValue(contractWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runContractBacktest(scriptRequest(), termsOf('5', '0.1', 'longOnly'))

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/contract-backtests`,
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          symbol: 'BTCUSDT',
          aggregationInterval: '1h',
          leverage: '5',
          slippagePercentage: '0.1',
          tradingMode: 'longOnly',
        }),
      }))
  })

  it('留白的槓桿與滑點不上線——交易服務讀成一倍、不計滑點', async () => {
    const fetchMock = vi.fn().mockResolvedValue(contractWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runContractBacktest(scriptRequest(), termsOf('0', '0', 'longShort'))

    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('leverage')
    expect(body).not.toHaveProperty('slippagePercentage')
    expect(body.tradingMode).toBe('longShort')
  })

  it('一份合約交易策略送到它自己底下的合約重演入口，不帶交易模式', async () => {
    const fetchMock = vi.fn().mockResolvedValue(contractWire())
    vi.stubGlobal('$fetch', fetchMock)

    await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runContractTradingStrategyBacktest(tradingStrategyRequest(), termsOf('3', '0', null))

    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE_URL}/trading-strategies/7/contract-backtests`)
    const body = fetchMock.mock.calls[0]![1].body
    expect(body.leverage).toBe('3')
    expect(body).not.toHaveProperty('tradingMode')
    expect(body).not.toHaveProperty('aggregationInterval')
  })

  it('合約那幾格讀進領域：保證金、槓桿、數量、資金費用與強平', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(contractWire()))

    const backtest = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runContractBacktest(scriptRequest(), termsOf('5', '0', 'shortOnly'))

    const closedTrade = backtest.closedTrades[0]!
    expect(closedTrade.stake.toString()).toBe('10000')
    expect(closedTrade.exitReason).toBe('liquidation')
    expect(closedTrade.contractFigures?.leverage.toString()).toBe('5')
    expect(closedTrade.contractFigures?.quantity.toString()).toBe('500')
    expect(closedTrade.contractFigures?.fundingFee.toString()).toBe('-5')
    expect(backtest.contractFigures?.tradingMode).toBe('shortOnly')
    expect(backtest.contractFigures?.liquidationExitCount).toBe(1)
    expect(backtest.contractFigures?.blockedOpeningCount).toBe(2)
    expect(backtest.contractFigures?.longWinRate).toBeNull()
    expect(backtest.contractFigures?.maintenanceMarginBasisKind).toBe('tiers')
    expect(backtest.contractFigures?.maintenanceMarginConfirmedAt?.toISOString())
      .toBe('2026-09-01T00:00:00.000Z')
  })

  it.each([
    { field: 'leverage', message: '這個合約標的最高只能開 125 倍槓桿' },
    { field: 'tradingMode', message: '交易模式由交易策略自己決定' },
    { field: 'slippage', message: '滑點不得為負' },
  ])('交易服務指名 $field 那一格時，那句話落在那一格', async ({ field, message }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(Object.assign(new Error(message), {
      response: { status: 400 },
      data: { message, field },
    })))

    const failure = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runContractBacktest(scriptRequest(), termsOf('5', '0', 'longShort'))
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe(field)
    expect((failure as BacktestFieldError).message).toContain(message)
  })

  it('合約交易策略重演被拒絕時，同一套分流照樣把話落在那一格', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(Object.assign(new Error('交易模式由交易策略自己決定'), {
      response: { status: 400 },
      data: { message: '交易模式由交易策略自己決定', field: 'tradingMode' },
    })))

    const failure = await new BacktestProxy(BASE_URL, signedInSessionStorage())
      .runContractTradingStrategyBacktest(tradingStrategyRequest(), termsOf('3', '0', null))
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BacktestFieldError)
    expect((failure as BacktestFieldError).field).toBe('tradingMode')
  })
})
