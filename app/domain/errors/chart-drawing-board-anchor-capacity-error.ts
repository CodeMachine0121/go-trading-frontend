import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 哨兵錯誤：加上這一個繪圖，這張繪圖板的點數總和就超過上限，所以不收。 */
export class ChartDrawingBoardAnchorCapacityError extends LocalizedError {
  constructor() {
    super(new LocalizedTextVo(
      '這張圖上的繪圖點數已達上限，請先移除一些繪圖',
      'This chart has reached its drawing point limit. Remove some drawings first.'))
    this.name = 'ChartDrawingBoardAnchorCapacityError'
  }
}
