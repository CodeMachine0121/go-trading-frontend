import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'

const REPLAY_START = new Date('2026-09-01T00:00:00Z')

function closedTradeOf(
  direction: PositionDirection, profit: string, entryPrice = '100', exitPrice = '110',
): ClosedTrade {
  return new ClosedTrade(
    direction,
    REPLAY_START,
    new Decimal(entryPrice),
    new Date('2026-09-02T00:00:00Z'),
    new Decimal(exitPrice),
    new Decimal('10000'),
    new Decimal(profit))
}

function backtestOf(overrides: Partial<{
  totalReturnRate: number
  maximumDrawdown: number
  winRate: number | null
  positionOpenCount: number
  closedTrades: ClosedTrade[]
  equityCurve: EquityPoint[]
  finalEquity: string
}> = {}): Backtest {
  return new Backtest(
    'BTCUSDT',
    '1h',
    REPLAY_START,
    new Date('2026-09-05T00:00:00Z'),
    5,
    new Decimal('10000'),
    new Decimal(overrides.finalEquity ?? '12500'),
    overrides.totalReturnRate ?? 0.25,
    overrides.maximumDrawdown ?? 0.1,
    overrides.winRate === undefined ? 0.75 : overrides.winRate,
    overrides.positionOpenCount ?? 4,
    overrides.closedTrades ?? [],
    overrides.equityCurve ?? [])
}

describe('BacktestDomain', () => {
  describe('成績單', () => {
    it('把六個數字都寫成可以直接畫的樣子', () => {
      const summary = backtestOf().toDomain().toDto().summary

      expect(summary.initialCapital).toBe('10000')
      expect(summary.finalEquity).toBe('12500')
      expect(summary.totalReturnRate).toBe('+25.00%')
      expect(summary.maximumDrawdown).toBe('10.00%')
      expect(summary.winRate).toBe('75.0%')
      expect(summary.tradeCount).toBe(0)
    })

    it('賺的總報酬率寫出正號，色調是綠的', () => {
      // 掃過一整張成績單時，符號比數字先被看見。
      const summary = backtestOf({ totalReturnRate: 0.25 }).toDomain().toDto().summary

      expect(summary.totalReturnRate).toBe('+25.00%')
      expect(summary.totalReturnTone).toBe('positive')
    })

    it('賠的總報酬率是紅的', () => {
      const summary = backtestOf({ totalReturnRate: -0.08 }).toDomain().toDto().summary

      expect(summary.totalReturnRate).toBe('-8.00%')
      expect(summary.totalReturnTone).toBe('negative')
    })

    it('不賺不賠是中性的，不是綠的', () => {
      const summary = backtestOf({ totalReturnRate: 0 }).toDomain().toDto().summary

      expect(summary.totalReturnRate).toBe('0.00%')
      expect(summary.totalReturnTone).toBe('neutral')
    })

    it('一筆都沒平倉時勝率是不適用，不是 0%', () => {
      // 沒有交易與每一筆都賠光是兩件不同的事。
      const summary = backtestOf({ winRate: null }).toDomain().toDto().summary

      expect(summary.winRate).toBe('不適用')
    })

    it('勝率為零與勝率不適用不一樣', () => {
      const summary = backtestOf({ winRate: 0 }).toDomain().toDto().summary

      expect(summary.winRate).toBe('0.0%')
    })

    it('交易次數數的是已平倉的那幾筆', () => {
      // 結束時還開著的那一個不在明細裡，所以也不在這個數字裡。
      const summary = backtestOf({
        positionOpenCount: 3,
        closedTrades: [closedTradeOf('long', '100'), closedTradeOf('short', '-50')],
      }).toDomain().toDto().summary

      expect(summary.tradeCount).toBe(2)
    })
  })

  describe('交易明細', () => {
    it('方向寫成給人看的名字', () => {
      const result = backtestOf({
        closedTrades: [closedTradeOf('long', '100'), closedTradeOf('short', '-50')],
      }).toDomain().toDto()

      expect(result.closedTrades[0]!.directionLabel).toBe('做多')
      expect(result.closedTrades[1]!.directionLabel).toBe('做空')
    })

    it('賺的那一筆是綠的、賠的那一筆是紅的', () => {
      const result = backtestOf({
        closedTrades: [closedTradeOf('long', '300'), closedTradeOf('short', '-120')],
      }).toDomain().toDto()

      expect(result.closedTrades[0]!.profit).toBe('300')
      expect(result.closedTrades[0]!.profitTone).toBe('positive')
      expect(result.closedTrades[1]!.profit).toBe('-120')
      expect(result.closedTrades[1]!.profitTone).toBe('negative')
    })

    it('恰好打平的那一筆是中性的', () => {
      const result = backtestOf({ closedTrades: [closedTradeOf('long', '0')] }).toDomain().toDto()

      expect(result.closedTrades[0]!.profitTone).toBe('neutral')
    })

    it('兩端的時間留成時間值，交給畫面照顯示時區寫出來', () => {
      const result = backtestOf({ closedTrades: [closedTradeOf('long', '100')] }).toDomain().toDto()

      expect(result.closedTrades[0]!.entryTime).toEqual(REPLAY_START)
      expect(result.closedTrades[0]!.exitTime).toEqual(new Date('2026-09-02T00:00:00Z'))
    })

    it('一筆都沒有時說得出這件事', () => {
      // 畫面接下來要做的不是「不畫表格」，而是明講——空白會讓人以為壞了。
      expect(backtestOf({ closedTrades: [] }).toDomain().toDto().hasNoTrades).toBe(true)
      expect(backtestOf({ closedTrades: [closedTradeOf('long', '1')] })
        .toDomain().toDto().hasNoTrades).toBe(false)
    })
  })

  describe('資金曲線', () => {
    it('每一點的金額仍然是精確小數', () => {
      // 繪圖函式庫只吃數字，但那是繪圖那一刻的限制，不是在這裡失去精度的許可。
      const result = backtestOf({
        equityCurve: [new EquityPoint(REPLAY_START, new Decimal('10000.123456789012345678'))],
      }).toDomain().toDto()

      expect(result.equityCurve[0]!.equity.toString()).toBe('10000.123456789012345678')
    })

    it('點的順序與後端給的一樣', () => {
      const result = backtestOf({
        equityCurve: [
          new EquityPoint(REPLAY_START, new Decimal('10000')),
          new EquityPoint(new Date('2026-09-02T00:00:00Z'), new Decimal('11000')),
        ],
      }).toDomain().toDto()

      expect(result.equityCurve).toHaveLength(2)
      expect(result.equityCurve[0]!.openTime).toEqual(REPLAY_START)
      expect(result.equityCurve[1]!.equity.toString()).toBe('11000')
    })
  })

  describe('這次實際重演了哪一段', () => {
    it('說出市場、彙總刻度與兩端，而且刻度已經是給人看的名字', () => {
      const result = backtestOf().toDomain().toDto()

      expect(result.symbol).toBe('BTCUSDT')
      expect(result.intervalLabel).toBe('一小時')
      expect(result.startTime).toEqual(REPLAY_START)
      expect(result.endTime).toEqual(new Date('2026-09-05T00:00:00Z'))
      expect(result.usedCandleCount).toBe(5)
    })
  })
})
