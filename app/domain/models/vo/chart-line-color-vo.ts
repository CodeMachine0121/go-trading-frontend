/**
 * VO：指標線可以挑的一種顏色。不可變、無行為。
 *
 * 它帶的是 **token 名稱**而不是色碼：色碼的唯一來源是設計 token 那一份檔案，
 * 領域這裡只說「用哪一個」，由畫面在繪圖時把它讀成實際顏色。
 */
export class ChartLineColorVo {
  constructor(
    public readonly token: string,
    public readonly label: string,
  ) {}
}

/**
 * 可挑的線色，**依序**排列。
 *
 * 順序是規則的一部分：沒挑過顏色的線就是從頭走過這條清單、
 * 取第一個目前沒被用掉的，所以前幾個彼此差得最遠——剛套上兩三支的當下最需要分得開。
 * 多一種顏色就是在這裡多一列（前提是 token 也補上）。
 */
export const CHART_LINE_COLORS: ChartLineColorVo[] = [
  new ChartLineColorVo('--color-chart-line-1', '橙'),
  new ChartLineColorVo('--color-chart-line-2', '綠'),
  new ChartLineColorVo('--color-chart-line-3', '紫'),
  new ChartLineColorVo('--color-chart-line-4', '藍'),
  new ChartLineColorVo('--color-chart-line-5', '粉'),
  new ChartLineColorVo('--color-chart-line-6', '青'),
]

/** 顏色用完時的歸屬——一條線沒有顏色就畫不出來，所以總得有一個。 */
export const FALLBACK_CHART_LINE_COLOR = CHART_LINE_COLORS[0]
