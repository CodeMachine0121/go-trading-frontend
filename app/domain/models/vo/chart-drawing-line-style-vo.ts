/** 繪圖的線怎麼畫。 */
export type ChartDrawingLineStyle = 'solid' | 'dashed' | 'dotted'

/** 依這個順序循環：每按一次線型換下一種，最後一種之後回到第一種。 */
export const CHART_DRAWING_LINE_STYLES: readonly ChartDrawingLineStyle[] = ['solid', 'dashed', 'dotted']

/** 線寬依 1、2、3、4 循環。 */
export const CHART_DRAWING_MINIMUM_LINE_WIDTH = 1
export const CHART_DRAWING_MAXIMUM_LINE_WIDTH = 4
