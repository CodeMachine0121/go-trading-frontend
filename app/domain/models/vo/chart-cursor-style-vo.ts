import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 沒選繪圖工具時，滑鼠在圖上的樣子。 */
export type ChartCursorStyleValue = 'cross' | 'dot' | 'arrow'

export class ChartCursorStyleVo {
  constructor(
    public readonly value: ChartCursorStyleValue,
    public readonly label: LocalizedTextVo,
  ) {}
}

/** 第一個是預設。 */
export const CHART_CURSOR_STYLES: readonly ChartCursorStyleVo[] = [
  new ChartCursorStyleVo('cross', new LocalizedTextVo('十字線', 'Cross')),
  new ChartCursorStyleVo('dot', new LocalizedTextVo('點', 'Dot')),
  new ChartCursorStyleVo('arrow', new LocalizedTextVo('箭頭', 'Arrow')),
]

export const CURSOR_TOOL_GROUP_LABEL = new LocalizedTextVo('游標', 'Cursors')
