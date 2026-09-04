import { describe, expect, it, vi } from 'vitest'
import { AssistantTriggerApplication } from '~/application/assistant-trigger-application'
import type { IAssistantTriggerPositionPreferenceProxy } from '~/domain/interface/i-assistant-trigger-position-preference-proxy'
import { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'
import { AssistantTriggerService } from '~/domain/service/assistant-trigger-service'

const BOUNDS = new AssistantTriggerBoundsDto(1000, 800, 52, 12)

/**
 * 注入**真的** domain service 與真的 domain model，只 mock 最外層的 proxy——
 * 測 application 時會連帶測到 service 與 model（見 .claude/rules/testing.md）。
 */
function buildApplicationUnderTest(remembered: AssistantTriggerPositionDto | null = null) {
  const proxy: IAssistantTriggerPositionPreferenceProxy = {
    readTriggerPosition: vi.fn().mockReturnValue(remembered),
    writeTriggerPosition: vi.fn(),
  }

  return {
    application: new AssistantTriggerApplication(new AssistantTriggerService(proxy)),
    proxy,
  }
}

describe('AssistantTriggerApplication', () => {
  it('讀回記住的位置，並夾回看得見的範圍', () => {
    const { application } = buildApplicationUnderTest(new AssistantTriggerPositionDto(9999, 50))

    expect(application.loadTriggerPosition(BOUNDS))
      .toEqual(new AssistantTriggerPositionDto(936, 50))
  })

  it('沒擺過時給右下角', () => {
    const { application } = buildApplicationUnderTest()

    expect(application.loadTriggerPosition(BOUNDS))
      .toEqual(new AssistantTriggerPositionDto(20, 20))
  })

  it('拖曳中的每一步都夾回範圍裡', () => {
    const { application } = buildApplicationUnderTest()

    expect(application.resolveTriggerPosition(new AssistantTriggerPositionDto(0, 9999), BOUNDS))
      .toEqual(new AssistantTriggerPositionDto(12, 736))
  })

  it('分得出拖曳與按一下', () => {
    const { application } = buildApplicationUnderTest()
    const origin = new AssistantTriggerPositionDto(20, 20)

    expect(application.wasDragged(origin, new AssistantTriggerPositionDto(21, 21))).toBe(false)
    expect(application.wasDragged(origin, new AssistantTriggerPositionDto(300, 300))).toBe(true)
  })

  it('記住放下的地方', () => {
    const { application, proxy } = buildApplicationUnderTest()

    application.rememberTriggerPosition(new AssistantTriggerPositionDto(300, 400))

    expect(proxy.writeTriggerPosition)
      .toHaveBeenCalledWith(new AssistantTriggerPositionDto(300, 400))
  })
})
