import { describe, expect, it } from 'vitest'
import { ChartLineColorDomain } from '~/domain/models/domains/chart-line-color-domain'
import { DrawnChartLinesVo } from '~/domain/models/vo/drawn-chart-lines-vo'

const FIRST = '--color-chart-line-1'
const SECOND = '--color-chart-line-2'
const THIRD = '--color-chart-line-3'

const LINE = '7:ma'
const ANOTHER_LINE = '7:signal'

/** 圖上畫著這幾個顏色，沒有任何一條線是「這一條」。 */
function drawnWith(takenColorTokens: readonly string[]): DrawnChartLinesVo {
  return new DrawnChartLinesVo(takenColorTokens, [])
}

describe('ChartLineColorDomain', () => {
  it('挑過顏色就用挑過的那個', () => {
    // 那是使用者明說的，它排在所有規則前面。
    expect(new ChartLineColorDomain(LINE, THIRD, drawnWith([])).token).toBe(THIRD)
  })

  it('挑過的顏色即使已經被別條線用掉了，還是用它', () => {
    // 替他改成另一個，比兩條同色更難理解。
    expect(new ChartLineColorDomain(LINE, THIRD, drawnWith([THIRD])).token).toBe(THIRD)
  })

  it('沒挑過時取第一個', () => {
    expect(new ChartLineColorDomain(LINE, null, drawnWith([])).token).toBe(FIRST)
  })

  it.each([
    { taken: [FIRST], expected: SECOND },
    { taken: [FIRST, SECOND], expected: THIRD },
    { taken: [SECOND], expected: FIRST },
  ])('沒挑過時避開已經用掉的 $taken，取 $expected', ({ taken, expected }) => {
    // 這是「剛套上三支就已經分得出來」的全部原因：少了「已經用掉的」這份輸入，
    // 第二支必然與第一支同色，而那正是顏色要解決的問題。
    expect(new ChartLineColorDomain(LINE, null, drawnWith(taken)).token).toBe(expected)
  })

  it('記著一個認不得的顏色時，當成沒挑過', () => {
    // 顏色清單改過之後，儲存裡可能留著一個已經不存在的名字。
    // 讓它畫不出來，遠比退回一個看得見的顏色糟。
    expect(new ChartLineColorDomain(LINE, '--color-chart-line-99', drawnWith([])).token).toBe(FIRST)
  })

  it('顏色全部被用掉時退回第一個，而不是沒有顏色', () => {
    // 一條線沒有顏色就畫不出來；重複的顏色至少還畫得出來。
    const allTaken = [1, 2, 3, 4, 5, 6].map(index => `--color-chart-line-${index}`)

    expect(new ChartLineColorDomain(LINE, null, drawnWith(allTaken)).token).toBe(FIRST)
  })
})

describe('ChartLineColorDomain：同一條線已經在圖上了', () => {
  // 同一支策略被套用兩次時，兩次畫的是**同一條線**——記憶身分一模一樣，
  // 於是都會去拿同一個記住的顏色。占著它的不是「別條線」，是它自己的第一份。
  it('這條線已經有一條在圖上時，不拿記住的顏色', () => {
    const drawn = new DrawnChartLinesVo([THIRD], [LINE])

    expect(new ChartLineColorDomain(LINE, THIRD, drawn).token).not.toBe(THIRD)
  })

  it('不拿記住的那個時，取一個目前沒被用掉的', () => {
    const drawn = new DrawnChartLinesVo([THIRD], [LINE])

    expect(new ChartLineColorDomain(LINE, THIRD, drawn).token).toBe(FIRST)
  })

  it('圖上那條是別條線時，記住的顏色照樣採用', () => {
    // 這一條與上面那條只差一個字：是不是同一條線。搞混它們的後果剛好相反——
    // 使用者明明挑好的顏色會被系統擅自換掉。
    const drawn = new DrawnChartLinesVo([THIRD], [ANOTHER_LINE])

    expect(new ChartLineColorDomain(LINE, THIRD, drawn).token).toBe(THIRD)
  })

  it('沒有挑過顏色時，圖上有沒有同一條線都不影響', () => {
    const drawn = new DrawnChartLinesVo([FIRST], [LINE])

    expect(new ChartLineColorDomain(LINE, null, drawn).token).toBe(SECOND)
  })
})
