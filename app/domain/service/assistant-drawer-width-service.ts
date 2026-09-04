import type { IAssistantDrawerWidthPreferenceProxy } from '~/domain/interface/i-assistant-drawer-width-preference-proxy'
import { AssistantDrawerWidthDomain } from '~/domain/models/domains/assistant-drawer-width-domain'

/**
 * 沒拉過的時候抽屜多寬。
 *
 * 420 像素放得下有小標與條列的回答，又不至於遮住半張圖——那是它一開始的樣子。
 */
const DEFAULT_DRAWER_WIDTH_PIXELS = 420

/**
 * Domain Service：助手抽屜的寬度。
 * 公開用例方法之間互不呼叫。
 *
 * 它與「那顆鍵擺在哪裡」分開，因為兩者會分開改變：一個是抽屜多寬，
 * 一個是那顆鍵的位置與拖曳門檻。合成一個 service，它的公開方法會乾淨地分成
 * 兩半互不相干——那正是一個盒子裡裝了兩樣東西的樣子。
 */
export class AssistantDrawerWidthService {
  constructor(
    private readonly assistantDrawerWidthPreferenceProxy: IAssistantDrawerWidthPreferenceProxy,
  ) {}

  /**
   * 讀回抽屜該有的寬度，**並夾回一個還能用的範圍**。
   *
   * 夾這一下不是多餘的：使用者可能上次在寬螢幕把它拉到 700，
   * 這次在窄視窗打開——記著的寬度照著用，那是一塊比視窗還寬的面板。
   */
  loadDrawerWidth(viewportWidth: number): number {
    const remembered = this.assistantDrawerWidthPreferenceProxy.readDrawerWidth()

    return new AssistantDrawerWidthDomain(remembered ?? DEFAULT_DRAWER_WIDTH_PIXELS)
      .clampedInto(viewportWidth)
  }

  /** 把這個寬度夾回還能用的範圍。拖曳中的每一步與視窗大小改變時都走它。 */
  resolveDrawerWidth(width: number, viewportWidth: number): number {
    return new AssistantDrawerWidthDomain(width).clampedInto(viewportWidth)
  }

  /** 記住使用者放手時的寬度。 */
  rememberDrawerWidth(width: number): void {
    this.assistantDrawerWidthPreferenceProxy.writeDrawerWidth(width)
  }
}
