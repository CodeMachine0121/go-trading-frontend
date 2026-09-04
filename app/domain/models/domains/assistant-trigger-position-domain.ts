import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'
import type { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'

/**
 * 移動超過這麼多像素才算「在拖它」，否則算「按了一下」。
 *
 * 一定要有一個門檻：手指與滑鼠在按下的瞬間幾乎都會抖一兩個像素，
 * 沒有門檻的話每一次按都會被當成拖曳，那顆鍵就再也按不開了。
 */
const DRAG_THRESHOLD_PIXELS = 4

/**
 * Domain Model：那顆叫出助手的鍵的位置，以及關於它的兩條規則。
 *
 * 一、**永遠夾回看得見的範圍**。拖到視窗外、或拖完之後把視窗縮小，
 * 那顆鍵就再也點不到了——而它是叫出助手的唯一入口，點不到等於功能消失。
 * 這條規則因此不能只在拖曳的時候套用，讀回記住的位置時也要套。
 *
 * 二、**分得出拖曳與按一下**。同一顆鍵要同時能按也能拖，靠的就是這個門檻。
 */
export class AssistantTriggerPositionDomain {
  constructor(private readonly position: AssistantTriggerPositionDto) {}

  /**
   * 夾回這塊範圍裡的位置。
   *
   * 範圍小到放不下那顆鍵時（極窄的視窗），一律退回邊緣留白的那個位置——
   * 夾出一個負數只會把它推得更遠。
   */
  clampedInto(bounds: AssistantTriggerBoundsDto): AssistantTriggerPositionDto {
    return new AssistantTriggerPositionDto(
      this.clamp(this.position.right, bounds.viewportWidth, bounds),
      this.clamp(this.position.bottom, bounds.viewportHeight, bounds),
    )
  }

  /** 從那個位置移動到這個位置，算是在拖它，還是只是按了一下。 */
  movedFarEnoughFrom(origin: AssistantTriggerPositionDto): boolean {
    const horizontalTravel = Math.abs(this.position.right - origin.right)
    const verticalTravel = Math.abs(this.position.bottom - origin.bottom)

    return Math.max(horizontalTravel, verticalTravel) >= DRAG_THRESHOLD_PIXELS
  }

  /**
   * 一個方向上夾住。兩個方向的算法一模一樣，只差量的是寬還是高——
   * 寫兩份的話，某一天只有其中一個方向會被修好。
   */
  private clamp(distance: number, viewportLength: number, bounds: AssistantTriggerBoundsDto): number {
    const furthest = viewportLength - bounds.triggerSize - bounds.margin
    if (furthest <= bounds.margin) {
      return bounds.margin
    }

    return Math.min(Math.max(distance, bounds.margin), furthest)
  }
}
