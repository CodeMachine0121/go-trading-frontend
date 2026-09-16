import { describe, expect, it } from 'vitest'
import { ConditionBoardDomain } from '~/domain/models/domains/condition-board-domain'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(operator: 'and' | 'or', ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(`g-${operator}`, operator, children, '', '')
}

function boardOf(condition: StrategyBotConditionDto | null) {
  return new StrategyBotConditionDomain(condition).toBoardDto()
}

/**
 * 一張墊子讀成好比對的樣子：一格一個字串，`代號:信號+信號`；
 * 扣成一組的用 `(且 A:… B:…)` 括起來。
 */
function readable(board: ConditionBoardDto): string[] {
  return board.items.map((item) => {
    const pieces = item.pieces.map(
      piece => `${piece.sourceLabel}:${piece.acceptedSignals.join('+')}`)

    return item.isBundle ? `(${item.operator} ${pieces.join(' ')})` : pieces[0]!
  })
}

/** 一棵樹讀成好比對的樣子。 */
function shapeOf(condition: StrategyBotConditionDto | null): string {
  if (condition === null) {
    return '（空）'
  }

  return condition.isGroup
    ? `${condition.operator}(${condition.conditions.map(child => shapeOf(child)).join(', ')})`
    : `${condition.sourceLabel}=${condition.signal}`
}

describe('一棵樹讀成一張表', () => {
  it('空的樹就是一張空墊子——上面一塊零件都沒有', () => {
    // 「沒擺上去」與「擺著但什麼都沒勾」是兩件事：一塊沒擺上去的零件
    // 不該佔著墊子上的位置。
    const board = boardOf(null)

    expect(readable(board)).toEqual([])
    expect(board.isEmpty).toBe(true)
    expect(board.representable).toBe(true)
  })

  it('一句比對就是墊子上一塊零件，收下一個信號', () => {
    expect(readable(boardOf(comparison('c', 'MACD', 'buy')))).toEqual(['MACD:buy'])
  })

  it('一排「且」就是每一列各打開一個', () => {
    const board = boardOf(
      group('and', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'sell')))

    expect(board.operator).toBe('and')
    expect(readable(board)).toEqual(['MACD:buy', 'ATR:sell'])
  })

  it('同一個運算子一路到底的巢狀，攤得平——它們本來就是同一件事', () => {
    // 「A 且（B 且 C）」與「A 且 B 且 C」說的是同一句話。
    const board = boardOf(
      group('and', comparison('a', 'MACD', 'buy'),
        group('and', comparison('b', 'ATR', 'buy'), comparison('c', 'EMA', 'buy'))))

    expect(board.representable).toBe(true)
    expect(readable(board)).toEqual(['MACD:buy', 'ATR:buy', 'EMA:buy'])
  })

  it('同一個來源的好幾句，收成同一列的好幾格', () => {
    // 「A 是買入或持有」——一格是一個集合，正是為了說得出這句話。
    const board = boardOf(
      group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'MACD', 'hold')))

    expect(readable(board)).toEqual(['MACD:buy+hold'])
  })

  it('「且」底下掛一個只講同一個來源的「或」，也畫得出來', () => {
    // 那正是「MACD 是買入或持有，而且 ATR 是買入」在樹上的樣子。
    const board = boardOf(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'MACD', 'hold')),
        comparison('c', 'ATR', 'buy')))

    expect(board.representable).toBe(true)
    expect(readable(board)).toEqual(['MACD:buy+hold', 'ATR:buy'])
  })

  it('「A 而且（B 或 C）」讀成一組加一塊——那正是一組存在的理由', () => {
    const board = boardOf(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
        comparison('c', 'EMA', 'buy')))

    expect(board.representable).toBe(true)
    expect(readable(board)).toEqual(['(or MACD:buy ATR:buy)', 'EMA:buy'])
  })

  it('一組裡面還有一組就讀不出來——**不硬壓平**', () => {
    // 壓平會得到一個意思不同的條件，而使用者會在完全沒察覺的情況下把它存回去。
    const board = boardOf(
      group('and',
        group('or',
          comparison('a', 'MACD', 'buy'),
          group('and', comparison('b', 'ATR', 'buy'), comparison('c', 'EMA', 'buy'))),
        comparison('d', 'RSI', 'buy')))

    expect(board.representable).toBe(false)
  })

  it('順序照著樹——那正是使用者在墊子上排出來的順序', () => {
    // 照別的順序讀回來，他會看到自己排過的東西被打亂。
    const board = boardOf(
      group('and', comparison('b', 'ATR', 'buy'), comparison('a', 'MACD', 'buy')))

    expect(readable(board)).toEqual(['ATR:buy', 'MACD:buy'])
  })

  it('信號的順序照著固定的那一份，不是照著樹裡出現的順序', () => {
    // 同樣的一格在兩台機器人上要長得一樣。
    const board = boardOf(
      group('or', comparison('a', 'MACD', 'hold'), comparison('b', 'MACD', 'buy')))

    expect(board.items[0]!.pieces[0]!.acceptedSignals).toEqual(['buy', 'hold'])
  })
})

describe('一張表寫回一棵樹', () => {
  function boardDomain(operator: 'and' | 'or', rows: [string, string[]][]) {
    return new ConditionBoardDomain(new ConditionBoardDto(
      operator,
      rows.map(([label, signals]) => new ConditionBoardItemDto(
        null, [new ConditionBoardPieceDto(label, signals)])),
      true))
  }

  it('一列都沒參與就是空的條件', () => {
    expect(boardDomain('and', [['MACD', []]]).toCondition()).toBeNull()
  })

  it('只有一列參與時不多包一層群組', () => {
    expect(shapeOf(boardDomain('and', [['MACD', ['buy']], ['ATR', []]]).toCondition()))
      .toBe('MACD=buy')
  })

  it('幾列各一格，就是一排用那個運算子串起來的比對', () => {
    expect(shapeOf(boardDomain('or', [['MACD', ['buy']], ['ATR', ['sell']]]).toCondition()))
      .toBe('or(MACD=buy, ATR=sell)')
  })

  it('一列打開好幾格，那一列自己是一個「或」', () => {
    expect(shapeOf(boardDomain('and', [['MACD', ['buy', 'hold']], ['ATR', ['buy']]]).toCondition()))
      .toBe('and(or(MACD=buy, MACD=hold), ATR=buy)')
  })
})

describe('來回轉換不會改變意思', () => {
  const cases: { name: string, condition: StrategyBotConditionDto }[] = [
    {
      name: '一塊零件',
      condition: comparison('c', 'MACD', 'buy'),
    },
    {
      name: '一排且',
      condition: group('and', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'sell')),
    },
    {
      name: '一排或',
      condition: group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'sell')),
    },
    {
      name: '同一塊零件收好幾個信號',
      condition: group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'MACD', 'hold')),
        comparison('c', 'ATR', 'buy')),
    },
    {
      name: 'A 而且（B 或 C）',
      condition: group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
        comparison('c', 'EMA', 'buy')),
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.name}：讀成表再寫回去，形狀一樣`, () => {
      // 這是整個做法站不站得住的那一條：表只是那棵樹的另一種說法，
      // 不是第二份資料。讀一趟就變一次意思的話，使用者每打開一次就損失一點東西。
      const board = boardOf(testCase.condition)
      const backAgain = new ConditionBoardDomain(board).toCondition()

      expect(shapeOf(backAgain)).toBe(shapeOf(testCase.condition))
    })
  }
})

describe('改一張表', () => {
  const start = () => new ConditionBoardDomain(new ConditionBoardDto(
    'and', [new ConditionBoardItemDto(null, [new ConditionBoardPieceDto('MACD', ['buy'])])],
    true))

  it('按一格沒開的就打開它', () => {
    expect(start().toggleSignal('MACD', 'hold').value.items[0]!.pieces[0]!.acceptedSignals)
      .toEqual(['buy', 'hold'])
  })

  it('按一格開著的就關掉它', () => {
    expect(start().toggleSignal('MACD', 'buy').value.items[0]!.pieces[0]!.acceptedSignals).toEqual([])
  })

  it('換運算子時哪幾格開著一格都不動', () => {
    const changed = start().changeOperator('or')

    expect(changed.value.operator).toBe('or')
    expect(changed.value.items[0]!.pieces[0]!.acceptedSignals).toEqual(['buy'])
  })

  it('零件被丟掉時，墊子上那一塊跟著收走——但它不會自己跳上墊子', () => {
    // 一個自己跑到工作區的零件，會讓使用者覺得畫面在替他做決定。
    expect(readable(start().alignedTo(['MACD', 'ATR']).value)).toEqual(['MACD:buy'])
    expect(readable(start().alignedTo(['ATR']).value)).toEqual([])
  })

  it('把一塊零件擺上墊子，它預設收下買入', () => {
    // 一塊擺在墊子上卻什麼都不收的零件，是一句永遠不成立的話，
    // 而它看起來跟一句填好的一模一樣。
    expect(readable(start().placeAt('ATR', 1).value)).toEqual(['MACD:buy', 'ATR:buy'])
  })

  it('已經在墊子上的零件再擺一次，是搬位置，不是複製', () => {
    const twoPieces = start().placeAt('ATR', 1)

    expect(readable(twoPieces.placeAt('ATR', 0).value)).toEqual(['ATR:buy', 'MACD:buy'])
  })

  it('把一塊零件拿下墊子', () => {
    expect(readable(start().takeOff('MACD').value)).toEqual([])
  })

  it('問得出一塊零件在不在這張墊子上', () => {
    expect(start().holds('MACD')).toBe(true)
    expect(start().holds('ATR')).toBe(false)
  })
})
