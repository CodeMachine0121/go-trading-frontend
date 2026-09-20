import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import type { TradeExitReason } from '~/domain/models/vo/trade-exit-reason-vo'

const REPLAY_START = new Date('2026-09-01T00:00:00Z')

function closedTradeOf(
  direction: PositionDirection, profit: string, entryPrice = '100', exitPrice = '110',
  exitReason: TradeExitReason = 'signal',
  entryCost = new Decimal(0),
  exitCost = new Decimal(0),
): ClosedTrade {
  return new ClosedTrade(
    direction,
    REPLAY_START,
    new Decimal(entryPrice),
    new Date('2026-09-02T00:00:00Z'),
    new Decimal(exitPrice),
    new Decimal('10000'),
    new Decimal(profit), exitReason, entryCost, exitCost)
}

describe('BacktestDomain 結束時還抱不抱著一注', () => {
  it('開幾次倉照實傳到成績單上', () => {
    // 它一路從後端送到 entity 都在，卻曾經在轉成畫面形狀的那一步被丟掉——
    // 於是一張空明細唯一說得通的另一種原因在畫面上完全看不出來。
    const resultDto = backtestOf({
      positionOpenCount: 4,
      closedTrades: [closedTradeOf('long', '100'), closedTradeOf('long', '200'),
        closedTradeOf('long', '300'), closedTradeOf('long', '400')],
    }).toDomain().toDto()

    expect(resultDto.summary.positionOpenCount).toBe(4)
    expect(resultDto.summary.tradeCount).toBe(4)
    expect(resultDto.summary.hasOpenPosition).toBe(false)
  })

  it('開了一次卻一次都沒平，就是還抱著那一注', () => {
    // 一支每一棒都說買入的算式就長這樣：開一次，然後每一棒的買入都是空操作。
    const resultDto = backtestOf({
      positionOpenCount: 1, closedTrades: [],
    }).toDomain().toDto()

    expect(resultDto.summary.positionOpenCount).toBe(1)
    expect(resultDto.summary.tradeCount).toBe(0)
    expect(resultDto.summary.hasOpenPosition).toBe(true)
  })

  it('一次都沒開倉就不是還抱著', () => {
    const resultDto = backtestOf({
      positionOpenCount: 0, closedTrades: [],
    }).toDomain().toDto()

    expect(resultDto.summary.positionOpenCount).toBe(0)
    expect(resultDto.summary.hasOpenPosition).toBe(false)
  })
})

describe('BacktestDomain 的交易成本', () => {
  it('沒收過錢時累計成本是 null，畫面因此不多一格', () => {
    // 零與「沒收過錢」在這裡是同一件事：費率留白時後端回零，
    // 而使用者確實沒付過錢。多一格永遠是零的數字只會讓人以為它有什麼意思。
    const resultDto = backtestOf().toDomain().toDto()

    expect(resultDto.summary.totalTransactionCost).toBeNull()
  })

  it('收過錢時累計成本照金額的規則寫出來', () => {
    const resultDto = backtestOf({
      totalTransactionCost: new Decimal('210'),
    }).toDomain().toDto()

    expect(resultDto.summary.totalTransactionCost).toBe('210.00')
  })

  it('每一筆交易的兩筆成本也照金額的規則寫出來', () => {
    const resultDto = backtestOf({
      closedTrades: [closedTradeOf(
        'long', '790', '100', '110', 'signal', new Decimal('100'), new Decimal('110'))],
    }).toDomain().toDto()

    expect(resultDto.closedTrades[0]!.entryCost).toBe('100.00')
    expect(resultDto.closedTrades[0]!.exitCost).toBe('110.00')
  })
})

function backtestOf(overrides: Partial<{
  totalReturnRate: number
  maximumDrawdown: number
  winRate: number | null
  positionOpenCount: number
  conflictedCandleCount: number
  stopLossExitCount: number
  takeProfitExitCount: number
  liquidationExitCount: number
  totalTransactionCost: Decimal
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
    overrides.positionOpenCount ?? (overrides.closedTrades ?? []).length,
    overrides.conflictedCandleCount ?? 0,
    overrides.stopLossExitCount ?? 0,
    overrides.takeProfitExitCount ?? 0,
    overrides.liquidationExitCount ?? 0,
    overrides.totalTransactionCost ?? new Decimal(0),
    overrides.closedTrades ?? [],
    overrides.equityCurve ?? [])
}

describe('BacktestDomain', () => {
  it('兩個出場筆數原樣交出去，進位與說法都不必經手', () => {
    const resultDto = backtestOf({ stopLossExitCount: 2, takeProfitExitCount: 1 })
      .toDomain().toDto()

    expect(resultDto.summary.stopLossExitCount).toBe(2)
    expect(resultDto.summary.takeProfitExitCount).toBe(1)
  })

  it.each([
    ['signal' as TradeExitReason, '訊號'],
    ['stopLoss' as TradeExitReason, '止損'],
    ['takeProfit' as TradeExitReason, '止盈'],
  ])('%s 寫成中文的「%s」', (exitReason, expectedLabel) => {
    // 與方向那一組同一條規則：畫面一旦開始判断「這個值該寫成什麼字」，
    // 同一個判断就會出現在每一個顯示它的地方。
    const resultDto = backtestOf({
      closedTrades: [closedTradeOf('long', '1000', '100', '110', exitReason)],
    }).toDomain().toDto()

    expect(resultDto.closedTrades[0]!.exitReasonLabel).toBe(expectedLabel)
  })

  describe('成績單', () => {
    it('把六個數字都寫成可以直接畫的樣子', () => {
      const summary = backtestOf().toDomain().toDto().summary

      expect(summary.initialCapital).toBe('10000.00')
      expect(summary.finalEquity).toBe('12500.00')
      expect(summary.totalReturnRate).toBe('+25.00%')
      expect(summary.maximumDrawdown).toBe('10.00%')
      expect(summary.winRate).toBe('75.0%')
      expect(summary.tradeCount).toBe(0)
    })

    it('把算出來的一長串小數進位成一個看得完的金額', () => {
      // 口數是押注金額除以進場價，除出來十幾位小數；「最後剩多少」是它乘回價格。
      // 那個數字撐破自己那一格，還會蓋掉隔壁那一欄——精確小數是算用的，不是看用的。
      const summary = backtestOf({ finalEquity: '10219.284790870572819' })
        .toDomain().toDto().summary

      expect(summary.finalEquity).toBe('10219.28')
    })

    it('剛好整數的金額也寫兩位小數——一整欄要對得齊', () => {
      const summary = backtestOf({ finalEquity: '12500' }).toDomain().toDto().summary

      expect(summary.finalEquity).toBe('12500.00')
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

      expect(result.closedTrades[0]!.profit).toBe('300.00')
      expect(result.closedTrades[0]!.profitTone).toBe('positive')
      expect(result.closedTrades[1]!.profit).toBe('-120.00')
      expect(result.closedTrades[1]!.profitTone).toBe('negative')
    })

    it('恰好打平的那一筆是中性的', () => {
      const result = backtestOf({ closedTrades: [closedTradeOf('long', '0')] }).toDomain().toDto()

      expect(result.closedTrades[0]!.profitTone).toBe('neutral')
    })

    it('價格寫得比金額細，而且不寫出一串沒有意義的零', () => {
      // 帳戶餘額兩位小數綽綽有餘；一個標的的報價可能是 0.00001234，
      // 用兩位小數寫它會得到 0.00。
      const result = backtestOf({
        closedTrades: [closedTradeOf('long', '1', '0.000012345678901', '110.5')],
      }).toDomain().toDto()

      expect(result.closedTrades[0]!.entryPrice).toBe('0.00001235')
      expect(result.closedTrades[0]!.exitPrice).toBe('110.5')
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

  it('強平出場的筆數原樣交出去', () => {
    const resultDto = backtestOf({ liquidationExitCount: 2 }).toDomain().toDto()

    expect(resultDto.summary.liquidationExitCount).toBe(2)
  })

  it('被強制平倉的那一筆，出場原因寫成「強平」', () => {
    // 畫面一旦開始判斷「這個值該寫成什麼字」，同一個判斷就會出現在每一個顯示它的地方。
    const resultDto = backtestOf({
      closedTrades: [new ClosedTrade(
        'long', REPLAY_START, new Decimal('100'),
        new Date('2026-09-05T00:00:00Z'), new Decimal('80.5'),
        new Decimal('10000'), new Decimal('-10000'), 'liquidation',
        new Decimal(0), new Decimal(0))],
    }).toDomain().toDto()

    expect(resultDto.closedTrades[0]!.exitReasonLabel).toBe('強平')
  })
})
