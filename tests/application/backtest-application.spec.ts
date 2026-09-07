import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與所有 domain model 都是真的。
const SCRIPT_BODY = [
  'func Calculate(data []indicator.KCandle) indicator.Signal {',
  '\treturn indicator.Buy',
  '}',
].join('\n')

const START_TIME = new Date('2026-08-06T00:00:00Z')
const END_TIME = new Date('2026-09-04T23:59:59Z')

function completedBacktest(): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', START_TIME, END_TIME, 3,
    new Decimal('10000'), new Decimal('12500'), 0.25, 0.1, 0.75, 4,
    [new ClosedTrade(
      'long', START_TIME, new Decimal('100'), END_TIME, new Decimal('110'),
      new Decimal('10000'), new Decimal('1000'))],
    [new EquityPoint(START_TIME, new Decimal('10000'))])
}

function buildProxy(overrides: Partial<IBacktestProxy> = {}): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(completedBacktest()),
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
  scriptBody: string
  resultType: string
  parameters: StrategyParameterDto[]
  initialCapital: Decimal
  positionSizingMode: 'allIn' | 'percentage' | 'fixedAmount'
  positionSizingValue: Decimal
}> = {}): BacktestRequestDto {
  return new BacktestRequestDto(
    overrides.symbol ?? 'BTCUSDT',
    '1h',
    overrides.startTime ?? START_TIME,
    overrides.endTime ?? END_TIME,
    overrides.scriptBody ?? SCRIPT_BODY,
    overrides.resultType ?? 'signal',
    overrides.parameters ?? [],
    overrides.initialCapital ?? new Decimal('10000'),
    overrides.positionSizingMode ?? 'allIn',
    overrides.positionSizingValue ?? new Decimal('50'))
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

    it('把算式主體接上固定外框之後才送出去', async () => {
      // 兩個去處讀的是同一份算式，所以走的也是同一條組裝路徑。
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest())

      const sent = vi.mocked(proxy.runBacktest).mock.calls[0]![0] as BacktestRequestDomain
      expect(sent.script).toContain('package main')
      expect(sent.script).toContain(`)\n\n${SCRIPT_BODY}`)
    })

    it('宣告的旋鈕跟著一起送出去', async () => {
      const proxy = buildProxy()

      await buildApplication(proxy).runBacktest(backtestRequest({
        parameters: [new StrategyParameterDto('period', 'lookbackCount', 20)],
      }))

      const sent = vi.mocked(proxy.runBacktest).mock.calls[0]![0] as BacktestRequestDomain
      expect(sent.parameters.all).toHaveLength(1)
      expect(sent.parameters.all[0]!.name).toBe('period')
    })
  })

  describe('不合法就不送出', () => {
    it.each([
      ['交易標的空白', { symbol: '  ' }, 'symbol'],
      ['算式空白', { scriptBody: '   ' }, 'scriptBody'],
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
          expect(error.field).toBe('scriptBody')
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
