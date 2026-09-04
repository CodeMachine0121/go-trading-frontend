import { describe, expect, it, vi } from 'vitest'
import type { IAssistantTriggerPositionPreferenceProxy } from '~/domain/interface/i-assistant-trigger-position-preference-proxy'
import { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'
import { AssistantTriggerService } from '~/domain/service/assistant-trigger-service'

const BOUNDS = new AssistantTriggerBoundsDto(1000, 800, 52, 12)

// 替身一律用 vi.fn() 對介面產生，不手刻 Fake class（見 .claude/rules/testing.md）
function buildProxyMock(
  remembered: AssistantTriggerPositionDto | null = null,
): IAssistantTriggerPositionPreferenceProxy {
  return {
    readTriggerPosition: vi.fn().mockReturnValue(remembered),
    writeTriggerPosition: vi.fn(),
  }
}

describe('AssistantTriggerService.loadTriggerPosition', () => {
  it('沒擺過就在右下角', () => {
    // 那顆鍵永遠得在畫面上的某個地方，所以「沒擺過」是一個位置，不是「無」。
    const position = new AssistantTriggerService(buildProxyMock()).loadTriggerPosition(BOUNDS)

    expect(position).toEqual(new AssistantTriggerPositionDto(20, 20))
  })

  it('擺過就回到那裡', () => {
    const service = new AssistantTriggerService(
      buildProxyMock(new AssistantTriggerPositionDto(300, 400)))

    expect(service.loadTriggerPosition(BOUNDS))
      .toEqual(new AssistantTriggerPositionDto(300, 400))
  })

  it('上次擺在大螢幕的位置，這次在小視窗要夾回看得見的地方', () => {
    // 記著的位置照著擺就在視窗外面，而它是叫出助手的唯一入口。
    const service = new AssistantTriggerService(
      buildProxyMock(new AssistantTriggerPositionDto(3000, 3000)))

    expect(service.loadTriggerPosition(BOUNDS))
      .toEqual(new AssistantTriggerPositionDto(936, 736))
  })
})

describe('AssistantTriggerService.resolveTriggerPosition', () => {
  it('把位置夾回看得見的範圍', () => {
    const service = new AssistantTriggerService(buildProxyMock())

    expect(service.resolveTriggerPosition(new AssistantTriggerPositionDto(-99, 500), BOUNDS))
      .toEqual(new AssistantTriggerPositionDto(12, 500))
  })
})

describe('AssistantTriggerService.wasDragged', () => {
  it.each([
    { name: '一動也沒動', to: new AssistantTriggerPositionDto(20, 20), expected: false },
    { name: '抖了一下', to: new AssistantTriggerPositionDto(21, 20), expected: false },
    { name: '真的被拖走了', to: new AssistantTriggerPositionDto(400, 300), expected: true },
  ])('$name → $expected', ({ to, expected }) => {
    const service = new AssistantTriggerService(buildProxyMock())

    expect(service.wasDragged(new AssistantTriggerPositionDto(20, 20), to)).toBe(expected)
  })
})

describe('AssistantTriggerService.rememberTriggerPosition', () => {
  it('把放下的地方交給儲存', () => {
    const proxy = buildProxyMock()

    new AssistantTriggerService(proxy)
      .rememberTriggerPosition(new AssistantTriggerPositionDto(300, 400))

    expect(proxy.writeTriggerPosition)
      .toHaveBeenCalledWith(new AssistantTriggerPositionDto(300, 400))
  })
})
