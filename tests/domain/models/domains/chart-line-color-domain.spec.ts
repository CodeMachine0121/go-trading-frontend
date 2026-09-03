import { describe, expect, it } from 'vitest'
import { ChartLineColorDomain } from '~/domain/models/domains/chart-line-color-domain'

const FIRST = '--color-chart-line-1'
const SECOND = '--color-chart-line-2'
const THIRD = '--color-chart-line-3'

describe('ChartLineColorDomain', () => {
  it('挑過顏色就用挑過的那個', () => {
    // 那是使用者明說的，它排在所有規則前面。
    expect(new ChartLineColorDomain(THIRD, []).token).toBe(THIRD)
  })

  it('挑過的顏色即使已經被別條線用掉了，還是用它', () => {
    // 替他改成另一個，比兩條同色更難理解。
    expect(new ChartLineColorDomain(THIRD, [THIRD]).token).toBe(THIRD)
  })

  it('沒挑過時取第一個', () => {
    expect(new ChartLineColorDomain(null, []).token).toBe(FIRST)
  })

  it.each([
    { taken: [FIRST], expected: SECOND },
    { taken: [FIRST, SECOND], expected: THIRD },
    { taken: [SECOND], expected: FIRST },
  ])('沒挑過時避開已經用掉的 $taken，取 $expected', ({ taken, expected }) => {
    // 這是「剛套上三支就已經分得出來」的全部原因：少了「已經用掉的」這份輸入，
    // 第二支必然與第一支同色，而那正是顏色要解決的問題。
    expect(new ChartLineColorDomain(null, taken).token).toBe(expected)
  })

  it('記著一個認不得的顏色時，當成沒挑過', () => {
    // 顏色清單改過之後，儲存裡可能留著一個已經不存在的名字。
    // 讓它畫不出來，遠比退回一個看得見的顏色糟。
    expect(new ChartLineColorDomain('--color-chart-line-99', []).token).toBe(FIRST)
  })

  it('顏色全部被用掉時退回第一個，而不是沒有顏色', () => {
    // 一條線沒有顏色就畫不出來；重複的顏色至少還畫得出來。
    const allTaken = [1, 2, 3, 4, 5, 6].map(index => `--color-chart-line-${index}`)

    expect(new ChartLineColorDomain(null, allTaken).token).toBe(FIRST)
  })
})
