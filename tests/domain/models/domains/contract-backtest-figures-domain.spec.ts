import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import {
  Backtest,
  ClosedTrade,
  ContractBacktestFigures,
  ContractTradeFigures,
} from '~/domain/models/entities/backtest'

const START_TIME = new Date('2026-08-06T00:00:00Z')

function figuresOf(overrides: {
  totalFundingFee?: string
  longWinRate?: number | null
  shortWinRate?: number | null
  shortTradeCount?: number
  maintenanceMarginBasisKind?: string
  confirmedAt?: Date | null
} = {}): ContractBacktestFigures {
  return new ContractBacktestFigures(
    'longOnly', new Decimal(5), 1, new Decimal(overrides.totalFundingFee ?? '18'),
    3, overrides.longWinRate === undefined ? 2 / 3 : overrides.longWinRate,
    overrides.shortTradeCount ?? 0, overrides.shortWinRate === undefined ? null : overrides.shortWinRate,
    2, overrides.maintenanceMarginBasisKind ?? 'tiers',
    overrides.confirmedAt === undefined ? new Date('2026-09-01T00:00:00Z') : overrides.confirmedAt)
}

function backtestWith(contractFigures: ContractBacktestFigures | null, closedTrades: ClosedTrade[] = []) {
  return new Backtest(
    'BTCUSDT', '1h', START_TIME, START_TIME, 2, new Decimal(10000), new Decimal(9000),
    -0.1, 0.1, 0.5, closedTrades.length, 0, 0, 0, new Decimal(0), closedTrades, [], contractFigures)
}

function summaryOf(contractFigures: ContractBacktestFigures) {
  return backtestWith(contractFigures).toDomain().toDto().summary.contract!
}

describe('合約成績單', () => {
  it('交易模式、槓桿、強平與被擋下的開倉照實寫出', () => {
    const contract = summaryOf(figuresOf())

    expect(contract.tradingModeLabel).toBe('只做多')
    expect(contract.leverageLabel).toBe('5 倍')
    expect(contract.liquidationExitCount).toBe(1)
    expect(contract.blockedOpeningCount).toBe(2)
  })

  it.each([
    { totalFundingFee: '18', label: '付出 18.00', tone: 'negative' },
    { totalFundingFee: '-5', label: '收到 5.00', tone: 'positive' },
    { totalFundingFee: '0', label: '0.00', tone: 'neutral' },
  ])('累計資金費用 $totalFundingFee 寫成「$label」', ({ totalFundingFee, label, tone }) => {
    const contract = summaryOf(figuresOf({ totalFundingFee }))

    expect(contract.totalFundingFee).toBe(label)
    expect(contract.totalFundingFeeTone).toBe(tone)
  })

  it('做多做空各自的筆數與勝率；沒有空單的那一邊勝率不適用', () => {
    const contract = summaryOf(figuresOf())

    expect(contract.longTradeCount).toBe(3)
    expect(contract.longWinRate).toBe('66.7%')
    expect(contract.shortTradeCount).toBe(0)
    expect(contract.shortWinRate).toBe('不適用')
  })

  it('完整分級帶著確認時間，並說明用的是今天那一組', () => {
    const contract = summaryOf(figuresOf())

    expect(contract.maintenanceMarginBasisLabel).toBe('完整分級')
    expect(contract.maintenanceMarginConfirmedAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(contract.maintenanceMarginBasisNote).toContain('今天這一組')
  })

  it('最小那一級說明大部位的強平價會被算得太遠', () => {
    const contract = summaryOf(figuresOf({ maintenanceMarginBasisKind: 'smallestTier', confirmedAt: null }))

    expect(contract.maintenanceMarginBasisLabel).toBe('最小那一級')
    expect(contract.maintenanceMarginConfirmedAt).toBeNull()
    expect(contract.maintenanceMarginBasisNote).toContain('強平價會被算得太遠')
  })

  it('認不得的依據讀成比較保守的那一句：最小那一級', () => {
    const contract = summaryOf(figuresOf({ maintenanceMarginBasisKind: 'somethingNew', confirmedAt: null }))

    expect(contract.maintenanceMarginBasisLabel).toBe('最小那一級')
  })

  it('現貨重演的成績單沒有合約那一段', () => {
    expect(backtestWith(null).toDomain().toDto().summary.contract).toBeNull()
  })
})

describe('合約交易明細', () => {
  it('一筆五倍的強平空單寫出做空、槓桿、數量、保證金、資金費用與強平', () => {
    const closedTrade = new ClosedTrade(
      'short', START_TIME, new Decimal(100), START_TIME, new Decimal('119.5'),
      new Decimal(10000), new Decimal(-10000), 'liquidation', new Decimal(0), new Decimal(0),
      new ContractTradeFigures(new Decimal(5), new Decimal(500), new Decimal(5)))

    const tradeDto = backtestWith(figuresOf(), [closedTrade]).toDomain().toDto().closedTrades[0]!

    expect(tradeDto.directionLabel).toBe('做空')
    expect(tradeDto.exitReasonLabel).toBe('強平')
    expect(tradeDto.contract?.leverageLabel).toBe('5 倍')
    expect(tradeDto.contract?.quantity).toBe('500')
    expect(tradeDto.contract?.margin).toBe('10000.00')
    expect(tradeDto.contract?.fundingFee).toBe('5.00')
  })

  it('現貨的那一筆沒有合約那幾格', () => {
    const closedTrade = new ClosedTrade(
      'long', START_TIME, new Decimal(100), START_TIME, new Decimal(110),
      new Decimal(10000), new Decimal(1000), 'signal', new Decimal(0), new Decimal(0))

    expect(backtestWith(null, [closedTrade]).toDomain().toDto().closedTrades[0]!.contract).toBeNull()
  })
})
