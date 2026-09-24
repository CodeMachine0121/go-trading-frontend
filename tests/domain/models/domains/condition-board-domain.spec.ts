import { describe, expect, it } from 'vitest'
import { ConditionBoardDomain } from '~/domain/models/domains/condition-board-domain'
import { TradingStrategyConditionDomain } from '~/domain/models/domains/trading-strategy-condition-domain'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new TradingStrategyConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(operator: 'and' | 'or', ...children: TradingStrategyConditionDto[]) {
  return new TradingStrategyConditionDto(`g-${operator}`, operator, children, '', '')
}

function boardOf(condition: TradingStrategyConditionDto | null) {
  return new TradingStrategyConditionDomain(condition).toBoardDto()
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
function shapeOf(condition: TradingStrategyConditionDto | null): string {
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
  const cases: { name: string, condition: TradingStrategyConditionDto }[] = [
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

  it.each([
    { name: '還不在卡上的來源，排到最後面、只收挑的那一個', label: 'ATR', signal: 'sell', expected: ['MACD:buy', 'ATR:sell'] },
    { name: '挑的就是買入時，也只收買入', label: 'ATR', signal: 'buy', expected: ['MACD:buy', 'ATR:buy'] },
    { name: '已經在卡上的來源，是搬到最後面並改成只收這一個', label: 'MACD', signal: 'hold', expected: ['ATR:buy', 'MACD:hold'] },
  ])('加一條條件：$name', ({ label, signal, expected }) => {
    const twoClauses = start().placeAt('ATR', 1)

    expect(readable(twoClauses.addClause(label, signal).value)).toEqual(expected)
  })

  it('訊號來源改名時，條件跟著改名，擺在哪裡、收什麼都不動', () => {
    const twoClauses = start().placeAt('ATR', 1).toggleSignal('ATR', 'hold')

    expect(readable(twoClauses.renamed('ATR', '動能').value)).toEqual(['MACD:buy', '動能:buy+hold'])
  })
})

describe('把零件扣成一組，以及從一組裡拆出來', () => {
  /** 買入墊子上三塊各自獨立的零件。 */
  function threeApart() {
    return new ConditionBoardDomain(boardOf(group('and',
      comparison('a', 'MACD', 'buy'),
      comparison('b', 'ATR', 'buy'),
      comparison('c', 'RSI', 'buy'))))
  }

  it('把一塊疊到另一塊上，它們就扣成一組', () => {
    expect(readable(threeApart().bundleOnto('ATR', 'MACD').value))
      .toEqual(['(or MACD:buy ATR:buy)', 'RSI:buy'])
  })

  it('一組預設用「或」合併——不然它跟直接擺兩塊沒有差別', () => {
    // 墊子本身多半是「全部成立」，扣在一起的那幾塊如果也是，那一組就沒有存在的必要。
    expect(threeApart().bundleOnto('ATR', 'MACD').value.items[0]?.operator).toBe('or')
  })

  it('扣成一組之後寫回去的就是「A 而且（B 或 C）」', () => {
    const bundled = threeApart().bundleOnto('RSI', 'ATR')

    expect(shapeOf(bundled.toCondition()))
      .toBe('and(MACD=buy, or(ATR=buy, RSI=buy))')
  })

  it('疊到自己身上、或疊到自己已經在的那一組上，什麼都不會發生', () => {
    const bundled = threeApart().bundleOnto('ATR', 'MACD')

    expect(readable(bundled.bundleOnto('ATR', 'ATR').value)).toEqual(readable(bundled.value))
    expect(readable(bundled.bundleOnto('ATR', 'MACD').value)).toEqual(readable(bundled.value))
  })

  it('一組裡面不會再有一組——被拖過來的如果自己是一組，就整組攤進去', () => {
    // 三層以上的巢狀在實際的條件裡幾乎不出現，而它會讓「把一塊拖到另一塊上」
    // 這個動作變得沒有人說得準結果。
    const bundled = threeApart().bundleOnto('ATR', 'MACD')

    expect(readable(bundled.bundleOnto('MACD', 'RSI').value))
      .toEqual(['ATR:buy', '(or RSI:buy MACD:buy)'])
  })

  it('把一塊從一組裡拆出來，它回到自己一格，就排在那一組後面', () => {
    const bundled = threeApart().bundleOnto('ATR', 'MACD')

    expect(readable(bundled.unbundle('ATR').value))
      .toEqual(['MACD:buy', 'ATR:buy', 'RSI:buy'])
  })

  it('一組只剩一塊時自己散開——一個裝著一塊的組多一層框卻什麼都沒說', () => {
    const bundled = threeApart().bundleOnto('ATR', 'MACD')

    expect(bundled.unbundle('ATR').value.items[0]?.isBundle).toBe(false)
  })

  it('本來就沒扣在一起的那一塊，拆不拆都一樣', () => {
    expect(readable(threeApart().unbundle('RSI').value))
      .toEqual(['MACD:buy', 'ATR:buy', 'RSI:buy'])
  })

  it.each([
    {
      name: '另一格是單獨一條時，把它拉過來——這一條留在原地、排在前面',
      source: 'RSI',
      targetKey: 'ATR',
      expected: ['MACD:buy', '(or RSI:buy ATR:buy)'],
    },
    {
      name: '另一格已經是一組時，把這一條加進那一組',
      source: 'RSI',
      targetKey: 'MACD+ATR',
      expected: ['(or MACD:buy ATR:buy RSI:buy)'],
    },
    {
      name: '認不得的那一格，什麼都不會發生',
      source: 'RSI',
      targetKey: 'EMA',
      expected: ['(or MACD:buy ATR:buy)', 'RSI:buy'],
    },
  ])('和另一格扣成一組：$name', ({ source, targetKey, expected }) => {
    const start = targetKey === 'ATR' ? threeApart() : threeApart().bundleOnto('ATR', 'MACD')

    expect(readable(start.bundleWith(source, targetKey).value)).toEqual(expected)
  })

  it.each([
    { name: '兩條的一組', bundled: () => threeApart().bundleOnto('ATR', 'MACD'), itemKey: 'MACD+ATR', expected: ['MACD:buy', 'ATR:buy', 'RSI:buy'] },
    {
      name: '三條的一組，拆完順序與組裡一樣',
      bundled: () => threeApart().bundleOnto('ATR', 'MACD').bundleOnto('RSI', 'MACD'),
      itemKey: 'MACD+ATR+RSI',
      expected: ['MACD:buy', 'ATR:buy', 'RSI:buy'],
    },
    {
      name: '一組排在別的格後面，拆開的那幾條留在原地',
      bundled: () => threeApart().bundleOnto('RSI', 'ATR'),
      itemKey: 'ATR+RSI',
      expected: ['MACD:buy', 'ATR:buy', 'RSI:buy'],
    },
    { name: '單獨一條拆不拆都一樣', bundled: () => threeApart(), itemKey: 'RSI', expected: ['MACD:buy', 'ATR:buy', 'RSI:buy'] },
  ])('把一整組拆開：$name', ({ bundled, itemKey, expected }) => {
    const split = bundled().splitBundle(itemKey)

    expect(readable(split.value)).toEqual(expected)
    expect(split.value.items.every(item => !item.isBundle)).toBe(true)
  })

  it('換掉一組裡面怎麼合併，哪幾塊擺在哪裡一格都不動', () => {
    const bundled = threeApart().bundleOnto('ATR', 'MACD')

    expect(readable(bundled.changeBundleOperator('MACD+ATR', 'and').value))
      .toEqual(['(and MACD:buy ATR:buy)', 'RSI:buy'])
  })
})

describe('一張條件卡讀成畫面要的那幾個字', () => {
  function piece(sourceLabel: string, ...acceptedSignals: string[]) {
    return new ConditionBoardPieceDto(sourceLabel, acceptedSignals)
  }

  function worded(board: ConditionBoardDto) {
    return new ConditionBoardDomain(board).toDto()
  }

  it.each([
    { name: '收一個信號', accepted: ['buy'], sentence: '突破 等於 買入', plainWords: '', isUndecided: false },
    { name: '收兩個信號時照「其中之一」讀，並翻成人話', accepted: ['buy', 'hold'], sentence: '突破 等於 買入或持有', plainWords: '也就是「不是賣出」', isUndecided: false },
    { name: '三個都收', accepted: ['buy', 'sell', 'hold'], sentence: '突破 等於 買入或賣出或持有', plainWords: '也就是「不管它說什麼都算」', isUndecided: false },
    { name: '一個都沒收時照實說還沒決定', accepted: [], sentence: '突破 等於 （還沒選信號）', plainWords: '', isUndecided: true },
  ])('一條條件：$name', ({ accepted, sentence, plainWords, isUndecided }) => {
    const readOut = worded(new ConditionBoardDto('and', [
      new ConditionBoardItemDto(null, [piece('突破', ...accepted)]),
    ], true)).items[0]!.pieces[0]!

    expect(readOut.relationWord).toBe('等於')
    expect(readOut.sentence).toBe(sentence)
    expect(readOut.plainWords).toBe(plainWords)
    expect(readOut.isUndecided).toBe(isUndecided)
  })

  it.each([
    {
      name: '把兩條扣成一組並選「或」',
      board: new ConditionBoardDto('and', [
        new ConditionBoardItemDto('or', [piece('突破', 'buy'), piece('動能', 'buy')]),
      ], true),
      sentence: '突破 等於 買入 或 動能 等於 買入',
      readOut: '突破 等於 買入 或 動能 等於 買入',
    },
    {
      name: '一組旁邊還有別的格時加上括號',
      board: new ConditionBoardDto('and', [
        new ConditionBoardItemDto(null, [piece('均線', 'buy')]),
        new ConditionBoardItemDto('or', [piece('突破', 'buy'), piece('動能', 'hold')]),
      ], true),
      sentence: '均線 等於 買入 且 （突破 等於 買入 或 動能 等於 持有）',
      readOut: '均線 等於 買入 且 （突破 等於 買入 或 動能 等於 持有）',
    },
    {
      name: '空的一張不是一句話，讀出來那一行照實說還沒有',
      board: new ConditionBoardDto('and', [], true),
      sentence: '',
      readOut: '還沒有任何條件。',
    },
  ])('整張：$name', ({ board, sentence, readOut }) => {
    const dto = worded(board)

    expect(dto.sentence).toBe(sentence)
    expect(dto.readOut).toBe(readOut)
    expect(dto.relationWord).toBe('等於')
  })

  it.each([
    { operator: 'and' as const, boardJoiner: '且' },
    { operator: 'or' as const, boardJoiner: '或' },
  ])('格與格之間的連接詞跟著運算子走（$operator）', ({ operator, boardJoiner }) => {
    const dto = worded(new ConditionBoardDto(operator, [
      new ConditionBoardItemDto('and', [piece('突破', 'buy'), piece('動能', 'buy')]),
      new ConditionBoardItemDto(null, [piece('均線', 'buy')]),
    ], true))

    expect(dto.joinerWord).toBe(boardJoiner)
    expect(dto.items[0]!.joinerWord).toBe('且')
    expect(dto.items[1]!.joinerWord).toBe('')
  })
})
