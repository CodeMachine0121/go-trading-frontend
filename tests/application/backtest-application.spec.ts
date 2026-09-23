import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與所有 domain model 都是真的。
const WHOLE_SCRIPT = [
  'package main',
  '',
  'import "indicator"',
  '',
  'func Calculate(data []indicator.KCandle) indicator.Signal {',
  '\treturn indicator.Buy',
  '}',
].join('\n')

const START_TIME = new Date('2026-08-06T00:00:00Z')
const END_TIME = new Date('2026-09-04T23:59:59Z')

function completedBacktest(): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', START_TIME, END_TIME, 3,
    new Decimal('10000'), new Decimal('12500'), 0.25, 0.1, 0.75, 4, 0,
    0,
    0,
    new Decimal(0),
    [new ClosedTrade(
      'long', START_TIME, new Decimal('100'), END_TIME, new Decimal('110'),
      new Decimal('10000'), new Decimal('1000'), 'signal', new Decimal(0), new Decimal(0))],
    [new EquityPoint(START_TIME, new Decimal('10000'))])
}

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(completedBacktest()),
    ...overrides,
  }
}

function buildApplication(proxy: IBacktestProxy): BacktestApplication {
  return new BacktestApplication(new BacktestService(proxy))
}

function backtestRequest(overrides: Partial<{
  symbol: string
  startTime: Date
  endTime: Date
  script: string
  resultType: string
  parameters: StrategyScriptParameterDto[]
  initialCapital: Decimal
  positionSizingMode: 'allIn' | 'percentage' | 'fixedAmount'
  positionSizingValue: Decimal
  strategyScriptId: number
}> = {}): BacktestRequestDto {
  return new BacktestRequestDto(
    overrides.symbol ?? 'BTCUSDT',
    '1h',
    overrides.startTime ?? START_TIME,
    overrides.endTime ?? END_TIME,
    overrides.script ?? WHOLE_SCRIPT,
    overrides.resultType ?? 'signal',
    overrides.parameters ?? [],
    overrides.initialCapital ?? new Decimal('10000'),
    overrides.positionSizingMode ?? 'allIn',
    overrides.positionSizingValue ?? new Decimal('50'),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0),
    overrides.strategyScriptId)
}

describe('BacktestApplication', () => {
  describe('跑一次回測', () => {
    it('把結果交成已經可以直接畫的樣子', async () => {
      const result = await buildApplication(buildProxy()).runBacktest(backtestRequest())

      expect(result.summary.totalReturnRate).toBe('+25.00%')
      expect(result.summary.totalReturnTone).toBe('positive')
      expect(result.closedTrades).toHaveLength(1)
      expect(result.closedTrades[0]!.directionLabel).toBe('做多')
      expect(result.equityCurve).toHaveLength(1)
    })

    it('送出去的就是畫面上那一整份算式，一字不改', async () => {
      // 兩個去處讀的是同一份算式，所以送出去的也是同一份。
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest())

      const sent = vi.mocked(proxy.runBacktest).mock.calls[0]![0] as BacktestRequestDomain
      expect(sent.script).toBe(WHOLE_SCRIPT)
    })

    it('宣告的旋鈕跟著一起送出去', async () => {
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({
        parameters: [new StrategyScriptParameterDto('period', 'lookbackCount', 20)],
      }))

      const sent = vi.mocked(proxy.runBacktest).mock.calls[0]![0] as BacktestRequestDomain
      expect(sent.parameters.all).toHaveLength(1)
      expect(sent.parameters.all[0]!.name).toBe('period')
    })
  })

  describe('指名一支策略腳本來回測', () => {
    it('指名時算式留空也跑得動，送出去的就是那一支', async () => {
      // 從市集加入的那些沒有算式可以送——指名是它們唯一回測得了的方式。
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({ script: '', strategyScriptId: 9 }))

      const sent = vi.mocked(proxy.runBacktest).mock.calls[0]![0] as BacktestRequestDomain
      expect(sent.strategyScriptId).toBe(9)
      expect(sent.script).toBe('')
    })

    it('指名時只有空白字元的算式不算一段算式，也不跟著送', async () => {
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({ script: '  ', strategyScriptId: 9 }))

      const sent = vi.mocked(proxy.runBacktest).mock.calls[0]![0] as BacktestRequestDomain
      expect(sent.script).toBe('')
    })

    it('指名一支又自帶一段算式時擋在算式那一格，一次都沒打出去', async () => {
      const proxy = buildProxy()

      const rejection = await buildApplication(proxy)
        .runBacktest(backtestRequest({ strategyScriptId: 9 }))
        .catch((error: unknown) => error)

      expect(rejection).toBeInstanceOf(BacktestFieldError)
      expect((rejection as BacktestFieldError).field).toBe('script')
      expect((rejection as BacktestFieldError).message).toBe('指名一支策略腳本與自帶一段算式只能挑一種')
      expect(proxy.runBacktest).not.toHaveBeenCalled()
    })
  })

  describe('不合法就不送出', () => {
    it.each([
      ['交易標的空白', { symbol: '  ' }, 'symbol'],
      ['算式空白', { script: '   ' }, 'script'],
      ['起點晚於終點', { startTime: END_TIME, endTime: START_TIME }, 'timeRange'],
      ['本金為零', { initialCapital: new Decimal(0) }, 'initialCapital'],
      ['本金為負', { initialCapital: new Decimal(-100) }, 'initialCapital'],
      ['本金留白', { initialCapital: new Decimal(Number.NaN) }, 'initialCapital'],
      [
        '百分比為零',
        { positionSizingMode: 'percentage' as const, positionSizingValue: new Decimal(0) },
        'positionSizingValue',
      ],
      [
        '固定金額為零',
        { positionSizingMode: 'fixedAmount' as const, positionSizingValue: new Decimal(0) },
        'positionSizingValue',
      ],
    ])('%s：指名是哪一格，而且一次都沒打出去', async (_name, overrides, expectedField) => {
      const proxy = buildProxy()

      await expect(buildApplication(proxy).runBacktest(backtestRequest(overrides)))
        .rejects.toThrow(BacktestFieldError)
      await buildApplication(proxy).runBacktest(backtestRequest(overrides)).catch(
        (error: BacktestFieldError) => expect(error.field).toBe(expectedField))
      expect(proxy.runBacktest).not.toHaveBeenCalled()
    })

    it('指標值種類不是「一個信號」時擋在算式那一格，說出目前的種類', async () => {
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({ resultType: 'floatList' })).catch(
        (error: BacktestFieldError) => {
          expect(error.field).toBe('script')
          expect(error.message).toContain('一個信號')
          expect(error.message).toContain('一串數字')
        })
      expect(proxy.runBacktest).not.toHaveBeenCalled()
    })

    it('種類是「一個信號」但本金不合法時，擋的是本金那一格，不是種類', async () => {
      const proxy = buildProxy()

      await buildApplication(proxy)
        .runBacktest(backtestRequest({ resultType: 'signal', initialCapital: new Decimal(0) }))
        .catch((error: BacktestFieldError) => expect(error.field).toBe('initialCapital'))
      expect(proxy.runBacktest).not.toHaveBeenCalled()
    })

    it('種類是「一個信號」時正常送出', async () => {
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({ resultType: 'signal' }))

      expect(proxy.runBacktest).toHaveBeenCalled()
    })

    it('全押時那一格填什麼都不影響', async () => {
      // 使用者從百分比切到全押，那一格留著的數字不該讓他送不出去。
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({
        positionSizingMode: 'allIn', positionSizingValue: new Decimal(Number.NaN),
      }))

      expect(proxy.runBacktest).toHaveBeenCalled()
    })
  })

  describe('畫面問得到的那幾個預設值', () => {
    it('預設時間區間是三十天前的零點到昨天的最後一刻', () => {
      const range = buildApplication(buildProxy()).defaultTimeRange(
        new Date('2026-09-05T13:47:00Z'))

      expect(range.startTime.toISOString()).toBe('2026-08-06T00:00:00.000Z')
      expect(range.endTime.toISOString()).toBe('2026-09-04T23:59:59.999Z')
    })

    it('預設本金是一個大於零的數', () => {
      expect(buildApplication(buildProxy()).defaultInitialCapital().greaterThan(0)).toBe(true)
    })

    it('預設押注方式不需要旁邊那一格——按下去就能跑', () => {
      const application = buildApplication(buildProxy())
      const defaultMode = application.defaultPositionSizingMode()
      const defaultOption = application.listPositionSizingModeOptions()
        .find(option => option.value === defaultMode)

      expect(defaultOption?.requiresValue).toBe(false)
    })

    it('三種押注方式都在選單上，而且說得出旁邊要不要出現一格', () => {
      const options = buildApplication(buildProxy()).listPositionSizingModeOptions()

      expect(options.map(option => option.value)).toEqual(['allIn', 'percentage', 'fixedAmount'])
      expect(options.map(option => option.requiresValue)).toEqual([false, true, true])
    })
  })
})

describe('BacktestApplication 重演一整份交易策略', () => {
  function tradingStrategyRequest(overrides: Partial<{
    tradingStrategyId: number
    symbol: string
    startTime: Date
    endTime: Date
    initialCapital: Decimal
  }> = {}): TradingStrategyBacktestRequestDto {
    return new TradingStrategyBacktestRequestDto(
      overrides.tradingStrategyId ?? 7,
      overrides.symbol ?? 'BTCUSDT',
      overrides.startTime ?? START_TIME,
      overrides.endTime ?? END_TIME,
      overrides.initialCapital ?? new Decimal('10000'),
      'percentage',
      new Decimal('50'), new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0))
  }

  it('回來的形狀與重演一支腳本完全一樣，三個元件一種讀法就夠', async () => {
    const result = await buildApplication(buildProxy())
      .runTradingStrategyBacktest(tradingStrategyRequest())

    expect(result.summary.totalReturnRate).toBe('+25.00%')
    expect(result.closedTrades).toHaveLength(1)
    expect(result.equityCurve).toHaveLength(1)
  })

  it('還沒存過的那一份連送都不送——沒有東西可以指名', async () => {
    const proxy = buildProxy()

    await expect(buildApplication(proxy)
      .runTradingStrategyBacktest(tradingStrategyRequest({ tradingStrategyId: 0 })))
      .rejects.toBeInstanceOf(BacktestFieldError)
    expect(proxy.runTradingStrategyBacktest).not.toHaveBeenCalled()
  })

  it('起點晚於終點時當場擋下來，一次都沒打出去', async () => {
    // 驗證的規則與重演一支腳本同一套；少掉的只有算式與彙總刻度那兩格。
    const proxy = buildProxy()

    await expect(buildApplication(proxy).runTradingStrategyBacktest(tradingStrategyRequest({
      startTime: END_TIME, endTime: START_TIME })))
      .rejects.toMatchObject({ field: 'timeRange' })
    expect(proxy.runTradingStrategyBacktest).not.toHaveBeenCalled()
  })

  it('本金不是大於零時說在本金那一格', async () => {
    await expect(buildApplication(buildProxy())
      .runTradingStrategyBacktest(tradingStrategyRequest({ initialCapital: new Decimal('0') })))
      .rejects.toMatchObject({ field: 'initialCapital' })
  })

  it('沒挑標的時說在標的那一格', async () => {
    await expect(buildApplication(buildProxy())
      .runTradingStrategyBacktest(tradingStrategyRequest({ symbol: '' })))
      .rejects.toMatchObject({ field: 'symbol' })
  })
})
