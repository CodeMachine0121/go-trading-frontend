import { describe, expect, it } from 'vitest'
import { ConditionMatrixDomain } from '~/domain/models/domains/condition-matrix-domain'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { ConditionMatrixDto, ConditionMatrixRowDto } from '~/domain/models/dto/condition-matrix-dto'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(operator: 'and' | 'or', ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(`g-${operator}`, operator, children, '', '')
}

function matrixOf(condition: StrategyBotConditionDto | null, labels: readonly string[]) {
  return new StrategyBotConditionDomain(condition).toMatrixDto(labels)
}

/** 一張表讀成好比對的樣子：`代號:信號+信號`。 */
function readable(matrix: ConditionMatrixDto): string[] {
  return matrix.rows.map(row => `${row.sourceLabel}:${row.acceptedSignals.join('+')}`)
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
  it('空的樹就是每個來源各一列空的', () => {
    const matrix = matrixOf(null, ['MACD', 'ATR'])

    expect(readable(matrix)).toEqual(['MACD:', 'ATR:'])
    expect(matrix.isEmpty).toBe(true)
    expect(matrix.representable).toBe(true)
  })

  it('一句比對就是那一列打開一個信號，其餘的列空著', () => {
    const matrix = matrixOf(comparison('c', 'MACD', 'buy'), ['MACD', 'ATR'])

    expect(readable(matrix)).toEqual(['MACD:buy', 'ATR:'])
  })

  it('一排「且」就是每一列各打開一個', () => {
    const matrix = matrixOf(
      group('and', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'sell')),
      ['MACD', 'ATR'])

    expect(matrix.operator).toBe('and')
    expect(readable(matrix)).toEqual(['MACD:buy', 'ATR:sell'])
  })

  it('同一個運算子一路到底的巢狀，攤得平——它們本來就是同一件事', () => {
    // 「A 且（B 且 C）」與「A 且 B 且 C」說的是同一句話。
    const matrix = matrixOf(
      group('and', comparison('a', 'MACD', 'buy'),
        group('and', comparison('b', 'ATR', 'buy'), comparison('c', 'EMA', 'buy'))),
      ['MACD', 'ATR', 'EMA'])

    expect(matrix.representable).toBe(true)
    expect(readable(matrix)).toEqual(['MACD:buy', 'ATR:buy', 'EMA:buy'])
  })

  it('同一個來源的好幾句，收成同一列的好幾格', () => {
    // 「A 是買入或持有」——一格是一個集合，正是為了說得出這句話。
    const matrix = matrixOf(
      group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'MACD', 'hold')),
      ['MACD'])

    expect(readable(matrix)).toEqual(['MACD:buy+hold'])
  })

  it('「且」底下掛一個只講同一個來源的「或」，也畫得出來', () => {
    // 那正是「MACD 是買入或持有，而且 ATR 是買入」在樹上的樣子。
    const matrix = matrixOf(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'MACD', 'hold')),
        comparison('c', 'ATR', 'buy')),
      ['MACD', 'ATR'])

    expect(matrix.representable).toBe(true)
    expect(readable(matrix)).toEqual(['MACD:buy+hold', 'ATR:buy'])
  })

  it('且與或交錯、又講不同來源的，**不硬壓平**', () => {
    // 壓平會得到一個意思不同的條件，而使用者會在完全沒察覺的情況下把它存回去。
    const matrix = matrixOf(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
        comparison('c', 'EMA', 'buy')),
      ['MACD', 'ATR', 'EMA'])

    expect(matrix.representable).toBe(false)
  })

  it('樹上提到、但已經不在來源裡的代號仍然列出來，排在後面', () => {
    // 一列看不見的條件會在儲存時被擋下來，而他不知道它在哪裡。
    const matrix = matrixOf(
      group('and', comparison('a', 'MACD', 'buy'), comparison('b', '早就刪了', 'buy')),
      ['MACD'])

    expect(readable(matrix)).toEqual(['MACD:buy', '早就刪了:buy'])
  })

  it('信號的順序照著固定的那一份，不是照著樹裡出現的順序', () => {
    // 同樣的一格在兩台機器人上要長得一樣。
    const matrix = matrixOf(
      group('or', comparison('a', 'MACD', 'hold'), comparison('b', 'MACD', 'buy')),
      ['MACD'])

    expect(matrix.rows[0]!.acceptedSignals).toEqual(['buy', 'hold'])
  })
})

describe('一張表寫回一棵樹', () => {
  function matrixDomain(operator: 'and' | 'or', rows: [string, string[]][]) {
    return new ConditionMatrixDomain(new ConditionMatrixDto(
      operator, rows.map(([label, signals]) => new ConditionMatrixRowDto(label, signals)), true))
  }

  it('一列都沒參與就是空的條件', () => {
    expect(matrixDomain('and', [['MACD', []]]).toCondition()).toBeNull()
  })

  it('只有一列參與時不多包一層群組', () => {
    expect(shapeOf(matrixDomain('and', [['MACD', ['buy']], ['ATR', []]]).toCondition()))
      .toBe('MACD=buy')
  })

  it('幾列各一格，就是一排用那個運算子串起來的比對', () => {
    expect(shapeOf(matrixDomain('or', [['MACD', ['buy']], ['ATR', ['sell']]]).toCondition()))
      .toBe('or(MACD=buy, ATR=sell)')
  })

  it('一列打開好幾格，那一列自己是一個「或」', () => {
    expect(shapeOf(matrixDomain('and', [['MACD', ['buy', 'hold']], ['ATR', ['buy']]]).toCondition()))
      .toBe('and(or(MACD=buy, MACD=hold), ATR=buy)')
  })
})

describe('來回轉換不會改變意思', () => {
  const cases: { name: string, condition: StrategyBotConditionDto, labels: string[] }[] = [
    {
      name: '一句比對',
      condition: comparison('c', 'MACD', 'buy'),
      labels: ['MACD'],
    },
    {
      name: '一排且',
      condition: group('and', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'sell')),
      labels: ['MACD', 'ATR'],
    },
    {
      name: '一排或',
      condition: group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'sell')),
      labels: ['MACD', 'ATR'],
    },
    {
      name: '同一個來源的好幾句',
      condition: group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'MACD', 'hold')),
        comparison('c', 'ATR', 'buy')),
      labels: ['MACD', 'ATR'],
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.name}：讀成表再寫回去，形狀一樣`, () => {
      // 這是整個做法站不站得住的那一條：表只是那棵樹的另一種說法，
      // 不是第二份資料。讀一趟就變一次意思的話，使用者每打開一次就損失一點東西。
      const matrix = matrixOf(testCase.condition, testCase.labels)
      const backAgain = new ConditionMatrixDomain(matrix).toCondition()

      expect(shapeOf(backAgain)).toBe(shapeOf(testCase.condition))
    })
  }
})

describe('改一張表', () => {
  const start = () => new ConditionMatrixDomain(new ConditionMatrixDto(
    'and', [new ConditionMatrixRowDto('MACD', ['buy'])], true))

  it('按一格沒開的就打開它', () => {
    expect(start().toggleSignal('MACD', 'hold').value.rows[0]!.acceptedSignals)
      .toEqual(['buy', 'hold'])
  })

  it('按一格開著的就關掉它', () => {
    expect(start().toggleSignal('MACD', 'buy').value.rows[0]!.acceptedSignals).toEqual([])
  })

  it('換運算子時哪幾格開著一格都不動', () => {
    const changed = start().changeOperator('or')

    expect(changed.value.operator).toBe('or')
    expect(changed.value.rows[0]!.acceptedSignals).toEqual(['buy'])
  })

  it('來源變了，列跟著變，而留著的那幾列一格都不動', () => {
    // 表與來源是同一份東西的兩種看法，所以它們不會有「還沒同步」的狀態。
    const aligned = start().alignedTo(['MACD', 'ATR'])

    expect(readable(aligned.value)).toEqual(['MACD:buy', 'ATR:'])

    expect(readable(aligned.alignedTo(['ATR']).value)).toEqual(['ATR:'])
  })
})
