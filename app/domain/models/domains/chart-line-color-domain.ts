import type { ChartLineColorVo } from '~/domain/models/vo/chart-line-color-vo'
import { CHART_LINE_COLORS, FALLBACK_CHART_LINE_COLOR } from '~/domain/models/vo/chart-line-color-vo'
import type { DrawnChartLinesVo } from '~/domain/models/vo/drawn-chart-lines-vo'

/**
 * Domain Model：決定一條指標線用什麼顏色。
 *
 * 規則只有三條，順序不能顛倒：
 * 1. **這條線已經有一條在圖上了，就不拿記住的顏色**——那不是「別人占走了我的顏色」，
 *    占著它的**就是同一條線**。使用者明說的是「那條線是藍色」，
 *    不是「它的第二份複本也是藍色」，而兩條同色的線在圖上等於沒有顏色。
 * 2. **這條線挑過顏色就用那個**——那是使用者明說的，即使它已經被**別條線**用掉了也一樣。
 *    替他改成另一個，比兩條同色更難理解。
 * 3. 沒挑過就從清單裡取**第一個目前沒被用掉的**——所以剛套上兩三支的當下，
 *    使用者一次都不必動手就已經分得出哪條是哪條。
 *
 * 第一條與第二條的差別只有一個字：**是不是同一條線**。搞混它們的後果剛好相反——
 * 把第二條寫成第一條，使用者明明挑好的顏色會被系統擅自換掉。
 *
 * 「圖上現在畫著什麼」是這裡需要外面告訴它的唯一一件事。少了它，第二條線
 * 就會與第一條同色，而那正是顏色要解決的問題。
 *
 * 顏色不夠用時退回第一個：一條線沒有顏色就畫不出來，重複的顏色至少還畫得出來。
 */
export class ChartLineColorDomain {
  private readonly color: ChartLineColorVo

  constructor(lineKey: string, rememberedToken: string | null, drawnLines: DrawnChartLinesVo) {
    const remembered = CHART_LINE_COLORS.find(candidate => candidate.token === rememberedToken)
    if (remembered !== undefined && !drawnLines.alreadyDraws(lineKey)) {
      this.color = remembered
      return
    }

    this.color = CHART_LINE_COLORS.find(
      candidate => !drawnLines.takenColorTokens.includes(candidate.token))
    ?? FALLBACK_CHART_LINE_COLOR
  }

  get token(): string {
    return this.color.token
  }
}
