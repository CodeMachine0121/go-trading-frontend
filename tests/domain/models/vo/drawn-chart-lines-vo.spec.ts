import { describe, expect, it } from 'vitest'
import { DrawnChartLinesVo } from '~/domain/models/vo/drawn-chart-lines-vo'

describe('DrawnChartLinesVo', () => {
  it('這條線已經在圖上時說得出來', () => {
    expect(new DrawnChartLinesVo([], ['7:ma']).alreadyDraws('7:ma')).toBe(true)
  })

  it('別條線在圖上不算', () => {
    // 這一條與上面那條只差一個字：是不是同一條線。搞混它們的後果剛好相反。
    expect(new DrawnChartLinesVo([], ['7:signal']).alreadyDraws('7:ma')).toBe(false)
  })

  it('圖上什麼都沒有時一律不算', () => {
    expect(new DrawnChartLinesVo().alreadyDraws('7:ma')).toBe(false)
  })
})
