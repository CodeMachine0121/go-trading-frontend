import { describe, expect, it } from 'vitest'
import { AssistantTriggerPositionDomain } from '~/domain/models/domains/assistant-trigger-position-domain'
import { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

/** 一個 1000×800 的視窗，那顆鍵 52 像素，邊緣留 12。 */
const BOUNDS = new AssistantTriggerBoundsDto(1000, 800, 52, 12)

function positionOf(right: number, bottom: number): AssistantTriggerPositionDto {
  return new AssistantTriggerPositionDto(right, bottom)
}

describe('AssistantTriggerPositionDomain.clampedInto', () => {
  it('放得下的位置原樣留著', () => {
    const clamped = new AssistantTriggerPositionDomain(positionOf(200, 300)).clampedInto(BOUNDS)

    expect(clamped).toEqual(positionOf(200, 300))
  })

  it.each([
    { name: '貼著右邊', position: positionOf(0, 300), expected: positionOf(12, 300) },
    { name: '貼著下面', position: positionOf(200, 0), expected: positionOf(200, 12) },
    { name: '被拖出左邊', position: positionOf(5000, 300), expected: positionOf(936, 300) },
    { name: '被拖出上面', position: positionOf(200, 5000), expected: positionOf(200, 736) },
    { name: '負的距離', position: positionOf(-50, -50), expected: positionOf(12, 12) },
  ])('$name 一律夾回看得見的範圍', ({ position, expected }) => {
    // 那顆鍵是叫出助手的唯一入口。它跑到視窗外面，等於這個功能消失了。
    expect(new AssistantTriggerPositionDomain(position).clampedInto(BOUNDS)).toEqual(expected)
  })

  it('視窗小到放不下時退回邊緣留白的位置', () => {
    // 夾出一個負數只會把它推得更遠。
    const tinyBounds = new AssistantTriggerBoundsDto(60, 60, 52, 12)

    const clamped = new AssistantTriggerPositionDomain(positionOf(500, 500)).clampedInto(tinyBounds)

    expect(clamped).toEqual(positionOf(12, 12))
  })
})

describe('AssistantTriggerPositionDomain.movedFarEnoughFrom', () => {
  it.each([
    { name: '一動也沒動', to: positionOf(200, 300), expectedDragged: false },
    { name: '只抖了兩像素', to: positionOf(202, 301), expectedDragged: false },
    { name: '橫向移了四像素', to: positionOf(204, 300), expectedDragged: true },
    { name: '縱向移了四像素', to: positionOf(200, 304), expectedDragged: true },
    { name: '往回移了很多', to: positionOf(100, 300), expectedDragged: true },
  ])('$name → 算是拖曳嗎（$expectedDragged）', ({ to, expectedDragged }) => {
    // 沒有門檻的話，按下時手抖的那一兩個像素會把每一次按都變成拖曳，
    // 那顆鍵就再也按不開了。
    expect(new AssistantTriggerPositionDomain(to).movedFarEnoughFrom(positionOf(200, 300)))
      .toBe(expectedDragged)
  })
})
