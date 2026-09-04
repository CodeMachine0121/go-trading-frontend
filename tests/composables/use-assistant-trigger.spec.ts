// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'
import { AssistantTriggerApplication } from '~/application/assistant-trigger-application'
import { AssistantTriggerService } from '~/domain/service/assistant-trigger-service'
import type { IAssistantTriggerPositionPreferenceProxy } from '~/domain/interface/i-assistant-trigger-position-preference-proxy'

const preferenceProxy: IAssistantTriggerPositionPreferenceProxy = {
  readTriggerPosition: vi.fn(),
  writeTriggerPosition: vi.fn(),
}

/** 讓那顆鍵從這個位置開始：走的是「這台裝置記住的位置」，與實際使用時同一條路。 */
function seededAt(right: number, bottom: number) {
  vi.mocked(preferenceProxy.readTriggerPosition)
    .mockReturnValue(new AssistantTriggerPositionDto(right, bottom))
  const trigger = triggerUnderTest()
  trigger.loadTriggerPosition()

  return trigger
}

/**
 * 替身從參數進去，不去換掉 `useNuxtApp`——換掉它會連測試環境自己要用的
 * 路由同步一起弄壞。共用狀態（`useState`）走的是真的 Nuxt runtime。
 *
 * 注入的是**真的** application 與 service，只有最外層的儲存是替身：
 * 這裡要測的是拖曳的編排，而它依賴的夾回範圍與拖曳門檻都該是真的那一份。
 */
function triggerUnderTest() {
  return useAssistantTrigger(
    new AssistantTriggerApplication(new AssistantTriggerService(preferenceProxy)))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(preferenceProxy.readTriggerPosition).mockReturnValue(null)
  window.innerWidth = 1000
  window.innerHeight = 800
})

describe('useAssistantTrigger 讀回位置', () => {
  it('沒擺過就在右下角', () => {
    const { position, loadTriggerPosition } = triggerUnderTest()

    loadTriggerPosition()

    expect(position.value).toEqual(new AssistantTriggerPositionDto(20, 20))
  })

  it('擺過就回到那裡', () => {
    vi.mocked(preferenceProxy.readTriggerPosition)
      .mockReturnValue(new AssistantTriggerPositionDto(300, 400))
    const { position, loadTriggerPosition } = triggerUnderTest()

    loadTriggerPosition()

    expect(position.value).toEqual(new AssistantTriggerPositionDto(300, 400))
  })

  it('視窗變小就把它拉回看得見的地方', () => {
    // 不拉的話，那顆鍵會被推到視窗外面——而它是叫出助手的唯一入口。
    const { position, keepTriggerInView } = seededAt(900, 700)

    window.innerWidth = 400
    window.innerHeight = 400
    keepTriggerInView()

    expect(position.value).toEqual(new AssistantTriggerPositionDto(336, 336))
  })
})

describe('useAssistantTrigger 拖曳', () => {
  it('游標往左上移，那顆鍵就離右下更遠', () => {
    const { position, startDrag, moveDrag } = seededAt(20, 20)

    startDrag(900, 700)
    moveDrag(700, 500)

    expect(position.value).toEqual(new AssistantTriggerPositionDto(220, 220))
  })

  it('拖曳中一直夾在看得見的範圍裡', () => {
    // 拖到視窗外面的話，放下之後就再也點不到它了。
    const { position, startDrag, moveDrag } = seededAt(20, 20)

    startDrag(900, 700)
    moveDrag(-5000, -5000)

    expect(position.value).toEqual(new AssistantTriggerPositionDto(936, 736))
  })

  it('拖曳中看得出正在拖，放下就不是了', () => {
    const { dragging, startDrag, endDrag } = triggerUnderTest()

    startDrag(900, 700)
    expect(dragging.value).toBe(true)

    endDrag()
    expect(dragging.value).toBe(false)
  })

  it('真的拖過就記住新位置，而且不打開抽屜', () => {
    const { startDrag, moveDrag, endDrag } = seededAt(20, 20)

    startDrag(900, 700)
    moveDrag(700, 500)
    const wasTap = endDrag()

    expect(wasTap).toBe(false)
    expect(preferenceProxy.writeTriggerPosition)
      .toHaveBeenCalledWith(new AssistantTriggerPositionDto(220, 220))
  })

  it('只是按了一下就不記住，並回報這是一次按下', () => {
    // 每一次單純的按都寫一次瀏覽器儲存，是白寫的。
    const { startDrag, moveDrag, endDrag } = seededAt(20, 20)

    startDrag(900, 700)
    moveDrag(901, 701)
    const wasTap = endDrag()

    expect(wasTap).toBe(true)
    expect(preferenceProxy.writeTriggerPosition).not.toHaveBeenCalled()
  })

  it('沒按下就放下時什麼都不做', () => {
    const { endDrag } = triggerUnderTest()

    expect(endDrag()).toBe(false)
    expect(preferenceProxy.writeTriggerPosition).not.toHaveBeenCalled()
  })

  it('沒按下就移動時什麼都不做，而且不會因此變成拖曳中', () => {
    // 只斷言「這一次沒動」不夠：把第一次移動偷偷當成按下，這一次照樣不會動
    // （位移是零），但下一次就開始拖了——游標只是經過而已。
    const { position, dragging, moveDrag } = seededAt(20, 20)

    moveDrag(500, 500)
    moveDrag(300, 300)

    expect(position.value).toEqual(new AssistantTriggerPositionDto(20, 20))
    expect(dragging.value).toBe(false)
  })
})
