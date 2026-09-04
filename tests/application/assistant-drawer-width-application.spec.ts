import { describe, expect, it, vi } from 'vitest'
import { AssistantDrawerWidthApplication } from '~/application/assistant-drawer-width-application'
import type { IAssistantDrawerWidthPreferenceProxy } from '~/domain/interface/i-assistant-drawer-width-preference-proxy'
import { AssistantDrawerWidthService } from '~/domain/service/assistant-drawer-width-service'

const WIDE_VIEWPORT = 1600

/**
 * 注入**真的** domain service 與真的 domain model，只 mock 最外層的儲存——
 * 測 application 時會連帶測到 service 與 model（見 .claude/rules/testing.md）。
 */
function buildApplicationUnderTest(remembered: number | null = null) {
  const proxy: IAssistantDrawerWidthPreferenceProxy = {
    readDrawerWidth: vi.fn().mockReturnValue(remembered),
    writeDrawerWidth: vi.fn(),
  }

  return {
    application: new AssistantDrawerWidthApplication(new AssistantDrawerWidthService(proxy)),
    proxy,
  }
}

describe('AssistantDrawerWidthApplication', () => {
  it('沒拉過就是預設的那個寬度', () => {
    const { application } = buildApplicationUnderTest()

    expect(application.loadDrawerWidth(WIDE_VIEWPORT)).toBe(420)
  })

  it('拉過就回到那個寬度', () => {
    const { application } = buildApplicationUnderTest(560)

    expect(application.loadDrawerWidth(WIDE_VIEWPORT)).toBe(560)
  })

  it('上次在寬螢幕拉得很寬，這次在窄視窗要收回來', () => {
    // 記著的寬度照著用，那是一塊比視窗還寬的面板。
    const { application } = buildApplicationUnderTest(700)

    expect(application.loadDrawerWidth(600)).toBe(600 - 48)
  })

  it('拉動中的每一步都夾回還能用的範圍', () => {
    const { application } = buildApplicationUnderTest()

    expect(application.resolveDrawerWidth(50, WIDE_VIEWPORT)).toBe(320)
    expect(application.resolveDrawerWidth(9999, WIDE_VIEWPORT)).toBe(720)
  })

  it('記住放手時的寬度', () => {
    const { application, proxy } = buildApplicationUnderTest()

    application.rememberDrawerWidth(560)

    expect(proxy.writeDrawerWidth).toHaveBeenCalledWith(560)
  })
})
