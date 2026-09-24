import { LayoutDensityDto } from '~/domain/models/dto/layout-density-dto'
import type { LayoutDensity } from '~/domain/models/vo/layout-density-vo'

/**
 * 疏密分界。
 *
 * 未滿它用寬鬆那一套，達到它用密集那一套。同一個數字也是
 * **K 線「看什麼」預設收不收**、**AI-Assistant蓋不蓋滿畫面**的分界——
 * 三件事共用一道界線，不各立一道。它們回答的是同一個問題：
 * 「這是一隻手拿著的螢幕，還是一台坐著用的機器？」
 *
 * **樣式那一側有一份同名的副本**（`app/assets/styles/abstracts/_breakpoints.scss` 的 `md`），
 * 因為 media query 的條件讀不到 CSS 變數。改一個就要改另一個。
 */
const DENSITY_BOUNDARY_PIXELS = 768

/**
 * 導覽形狀分界。
 *
 * 未滿它導覽貼在畫面底部（一排分頁），達到它是那條固定側欄。它比疏密分界寬，
 * 因為平板的寬度雖然放得下寬鬆的表單，卻放不下八個並排的去處而不橫捲——
 * 刻意不為那一段另做第三種樣子。
 *
 * **樣式那一側有一份同名的副本**（`_breakpoints.scss` 的 `lg`）。改一個就要改另一個。
 */
const BOTTOM_NAVIGATION_BOUNDARY_PIXELS = 1024

/**
 * Domain Model：一個寬度代表什麼。
 *
 * 這是全站唯一知道那兩個數字的地方。呼叫端從來不知道它們存在——
 * 它不問「我現在多寬」，它問「導覽該貼在底部嗎」。
 *
 * 純視覺的鬆緊（間距、控制項高度）**不經過這裡**：那一套由樣式的 token
 * 在同一道分界上自己換，元件一行都不必改。會走到這裡的，
 * 一律是真的改變行為、改變畫不畫某樣東西的那幾件。
 */
export class LayoutDensityDomain {
  constructor(private readonly viewportWidthInPixels: number) {}

  toDto(): LayoutDensityDto {
    return new LayoutDensityDto(
      this.density,
      this.usesBottomNavigation,
      this.startsChartControlsCollapsed,
      this.assistantCoversScreen,
    )
  }

  private get holdableInOneHand(): boolean {
    return this.viewportWidthInPixels < DENSITY_BOUNDARY_PIXELS
  }

  private get density(): LayoutDensity {
    return this.holdableInOneHand ? 'roomy' : 'compact'
  }

  private get usesBottomNavigation(): boolean {
    return this.viewportWidthInPixels < BOTTOM_NAVIGATION_BOUNDARY_PIXELS
  }

  private get startsChartControlsCollapsed(): boolean {
    return this.holdableInOneHand
  }

  private get assistantCoversScreen(): boolean {
    return this.holdableInOneHand
  }
}
