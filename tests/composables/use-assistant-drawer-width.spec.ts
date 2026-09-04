// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantDrawerWidthApplication } from '~/application/assistant-drawer-width-application'
import { AssistantDrawerWidthService } from '~/domain/service/assistant-drawer-width-service'
import type { IAssistantDrawerWidthPreferenceProxy } from '~/domain/interface/i-assistant-drawer-width-preference-proxy'

const preferenceProxy: IAssistantDrawerWidthPreferenceProxy = {
  readDrawerWidth: vi.fn(),
  writeDrawerWidth: vi.fn(),
}

/**
 * 替身從參數進去，不去換掉 `useNuxtApp`——換掉它會連測試環境自己要用的
 * 路由同步一起弄壞。共用狀態（`useState`）走的是真的 Nuxt runtime。
 *
 * 注入的是**真的** application 與 service，只有最外層的儲存是替身：
 * 這裡要測的是拉動的編排，而它依賴的夾回範圍該是真的那一份。
 */
function widthUnderTest() {
  return useAssistantDrawerWidth(
    new AssistantDrawerWidthApplication(new AssistantDrawerWidthService(preferenceProxy)))
}

/** 讓抽屜從這個寬度開始：走的是「這台裝置記住的寬度」，與實際使用時同一條路。 */
function seededAt(width: number) {
  vi.mocked(preferenceProxy.readDrawerWidth).mockReturnValue(width)
  const drawerWidth = widthUnderTest()
  drawerWidth.loadDrawerWidth()

  return drawerWidth
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(preferenceProxy.readDrawerWidth).mockReturnValue(null)
  window.innerWidth = 1600
  widthUnderTest().loadDrawerWidth()
})

describe('useAssistantDrawerWidth 讀回寬度', () => {
  it('沒拉過就是預設的那個寬度', () => {
    const { width, loadDrawerWidth } = widthUnderTest()

    loadDrawerWidth()

    expect(width.value).toBe(420)
  })

  it('拉過就回到那個寬度', () => {
    const { width } = seededAt(560)

    expect(width.value).toBe(560)
  })

  it('視窗變窄就把抽屜收回來', () => {
    // 不收的話，抽屜會比視窗還寬。
    const { width, keepDrawerWidthUsable } = seededAt(700)

    window.innerWidth = 600
    keepDrawerWidthUsable()

    expect(width.value).toBe(600 - 48)
  })
})

describe('useAssistantDrawerWidth 拉動', () => {
  it('往左拉是變寬——抽屜靠右', () => {
    const { width, startResize, moveResize } = seededAt(420)

    startResize(1000)
    moveResize(900)

    expect(width.value).toBe(520)
  })

  it('往右拉是變窄', () => {
    const { width, startResize, moveResize } = seededAt(560)

    startResize(1000)
    moveResize(1100)

    expect(width.value).toBe(460)
  })

  it('拉動中一直夾在還能用的範圍裡', () => {
    const { width, startResize, moveResize } = seededAt(420)

    startResize(1000)
    moveResize(5000)
    expect(width.value).toBe(320)

    moveResize(-5000)
    expect(width.value).toBe(720)
  })

  it('拉動中看得出正在拉，放手就不是了', () => {
    const { resizing, startResize, endResize } = seededAt(420)

    startResize(1000)
    expect(resizing.value).toBe(true)

    endResize()
    expect(resizing.value).toBe(false)
  })

  it('真的拉動過就記住新寬度', () => {
    const { startResize, moveResize, endResize } = seededAt(420)

    startResize(1000)
    moveResize(900)
    endResize()

    expect(preferenceProxy.writeDrawerWidth).toHaveBeenCalledWith(520)
  })

  it('只是點了一下那條邊就不記住', () => {
    // 寬度沒變還寫一次瀏覽器儲存，是白寫的。
    const { startResize, endResize } = seededAt(420)

    startResize(1000)
    endResize()

    expect(preferenceProxy.writeDrawerWidth).not.toHaveBeenCalled()
  })

  it('沒抓住就放手時什麼都不做', () => {
    const { endResize } = seededAt(420)

    endResize()

    expect(preferenceProxy.writeDrawerWidth).not.toHaveBeenCalled()
  })

  it('沒抓住就移動時寬度不動，也不會因此變成拉動中', () => {
    // 只斷言「這一次沒變」不夠：把第一次移動偷偷當成抓住，這一次照樣不會變
    // （位移是零），但下一次就開始拉了——游標只是經過而已。
    const { width, resizing, moveResize } = seededAt(420)

    moveResize(1000)
    moveResize(800)

    expect(width.value).toBe(420)
    expect(resizing.value).toBe(false)
  })
})
