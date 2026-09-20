import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { BacktestConditionsDomain } from '~/domain/models/domains/backtest-conditions-domain'
import { TradingStrategyBacktestRequestDto }
  from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'

const START_TIME = new Date('2026-09-01T00:00:00Z')
const END_TIME = new Date('2026-09-05T00:00:00Z')
/** 一個比起點還早的終點：起點晚於終點是這一組唯一講不通的方式。 */
const BEFORE_START = new Date('2026-08-01T00:00:00Z')

/**
 * 一份每一組都講得通的條件。每個案例只弄壞它關心的那一格，其餘都是好的——
 * 這樣「說出來的是哪一句」才真的是被測的那件事。
 */
function conditions(overrides: Partial<{
  startTime: Date
  endTime: Date
  initialCapital: Decimal
  positionSizingValue: Decimal
  stopLossPercentage: Decimal
  entryCostPercentage: Decimal
  leverage: Decimal
  maintenanceMarginRate: Decimal
}> = {}, tradingMode: TradingMode | null = null) {
  return new BacktestConditionsDomain(new TradingStrategyBacktestRequestDto(
    7,
    'BTCUSDT',
    overrides.startTime ?? START_TIME,
    overrides.endTime ?? END_TIME,
    overrides.initialCapital ?? new Decimal('10000'),
    'percentage',
    overrides.positionSizingValue ?? new Decimal('50'),
    overrides.stopLossPercentage ?? new Decimal(0),
    new Decimal(0),
    overrides.entryCostPercentage ?? new Decimal(0),
    new Decimal(0),
    overrides.leverage ?? new Decimal(0),
    overrides.maintenanceMarginRate ?? new Decimal(0),
  ), tradingMode)
}

describe('BacktestConditionsDomain', () => {
  it('每一組都講得通就送得出去', () => {
    expect(() => conditions().validate()).not.toThrow()
  })

  it.each([
    ['期間', { endTime: BEFORE_START }, 'timeRange'],
    ['一開始多少錢', { initialCapital: new Decimal(0) }, 'initialCapital'],
    ['每次押多少', { positionSizingValue: new Decimal('150') }, 'positionSizingValue'],
    ['出場價位', { stopLossPercentage: new Decimal('-1') }, 'exitLevels'],
    ['交易成本', { entryCostPercentage: new Decimal('-1') }, 'transactionCosts'],
    ['槓桿', { leverage: new Decimal('0.5') }, 'leverage'],
  ])('%s 講不通時，指向的是那一組', (_name, broken, expectedField) => {
    // 六組全部由這裡問過一遍——兩個請求模型不再各自排一次順序，
    // 所以第七組加進來時，兩邊自動都問得到。
    expect(() => conditions(broken).validate())
      .toThrow(expect.objectContaining({ field: expectedField }))
  })

  it('一次只說一個理由，而且是表單由上往下的第一個', () => {
    // 使用者一次只改得動一格。全部弄壞時，他該先看到最上面那一句。
    expect(() => conditions({
      endTime: BEFORE_START,
      initialCapital: new Decimal(0),
      leverage: new Decimal('0.5'),
    }).validate()).toThrow(expect.objectContaining({ field: 'timeRange' }))
  })

  it('說得出交易模式時，現貨配槓桿當場擋下來', () => {
    expect(() => conditions({ leverage: new Decimal('3') }, 'spot').validate())
      .toThrow(expect.objectContaining({ field: 'leverage' }))
  })

  it('問不到交易模式時，那一條讓給後端', () => {
    // 重演一份交易策略時模式是那一份自己記著的，這張表單看不到它。
    expect(() => conditions({ leverage: new Decimal('3') }, null).validate()).not.toThrow()
  })
})
