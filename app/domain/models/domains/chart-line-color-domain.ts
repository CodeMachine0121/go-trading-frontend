import type { ChartLineColorVo } from '~/domain/models/vo/chart-line-color-vo'
import { CHART_LINE_COLORS, FALLBACK_CHART_LINE_COLOR } from '~/domain/models/vo/chart-line-color-vo'

/**
 * Domain Model：決定一條指標線用什麼顏色。
 *
 * 規則只有兩條，順序不能顛倒：
 * 1. **這條線挑過顏色就用那個**——那是使用者明說的，即使它已經被別條線用掉了也一樣。
 *    替他改成另一個，比兩條同色更難理解。
 * 2. 沒挑過就從清單裡取**第一個目前沒被用掉的**——所以剛套上兩三支的當下，
 *    使用者一次都不必動手就已經分得出哪條是哪條。
 *
 * 「目前沒被用掉的」是這裡需要外面告訴它的唯一一件事。少了它，第二條線
 * 就會與第一條同色，而那正是顏色要解決的問題。
 *
 * 顏色不夠用時退回第一個：一條線沒有顏色就畫不出來，重複的顏色至少還畫得出來。
 */
export class ChartLineColorDomain {
  private readonly color: ChartLineColorVo

  constructor(rememberedToken: string | null, takenTokens: readonly string[]) {
    const remembered = CHART_LINE_COLORS.find(candidate => candidate.token === rememberedToken)
    if (remembered !== undefined) {
      this.color = remembered
      return
    }

    this.color = CHART_LINE_COLORS.find(candidate => !takenTokens.includes(candidate.token))
      ?? FALLBACK_CHART_LINE_COLOR
  }

  get token(): string {
    return this.color.token
  }
}
