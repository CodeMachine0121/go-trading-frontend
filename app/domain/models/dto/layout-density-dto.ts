import type { LayoutDensity } from '~/domain/models/vo/layout-density-vo'

/**
 * DTO：現在這個寬度代表什麼。
 *
 * 畫面拿到的是**一組答案**，不是一個寬度——它因此不可能自己去比大小。
 * 那正是這份 DTO 存在的理由：四件事共用同一道分界，
 * 讓每個元件各自去問「我現在多寬」，那道分界就會有四份副本，
 * 而第五件事出現時會有第五份。
 *
 * 新增一件隨寬度改變的事＝這裡多一個欄位，呼叫端不動。
 */
export class LayoutDensityDto {
  constructor(
    /** 現在是哪一套鬆緊。純視覺的部分由樣式自己換，這一項是給需要知道的程式用的。 */
    public readonly density: LayoutDensity,
    /**
     * 導覽現在貼在畫面底部（而不是側邊那條固定側欄）。
     *
     * 一排拇指按得到的分頁，而不是藏在一顆鍵後面的清單：去處**永遠看得見**，
     * 換一個畫面是一下不是兩下，而手不必伸到螢幕最上緣。
     */
    public readonly usesBottomNavigation: boolean,
    /** 積木工作檯現在編得動。編不動的時候內容一個字都不少，只是改不了。 */
    public readonly allowsBlockEditing: boolean,
    /** K 線圖表的「看什麼」一開始就是收起的——高度先讓給圖。 */
    public readonly startsChartControlsCollapsed: boolean,
    /**
     * 行情助手佔掉整個畫面的寬度。
     *
     * 隨叫隨到的抽屜因此蓋滿畫面（而不是側邊那塊可拖寬的卡片），
     * 助手整頁也因此把寬度全給對話、把歷史收到一顆鍵後面——
     * 同一件事的兩種長相：這個寬度分不出第二欄給任何東西。
     */
    public readonly assistantCoversScreen: boolean,
  ) {}

  /**
   * 這一份答案與那一份說的是不是同一件事。
   *
   * 拖動視窗邊緣時，寬度每一幀都在變，但**答案一整段都不會變**——
   * 從 900 拖到 850 什麼都沒發生，跨過 768 才發生一件事。
   * 沒有這個比較，每一幀都會生出一份全新的答案，而拿著它的三個畫面
   * 會在使用者拖動的那一整秒裡各重繪六十次，卻沒有任何一個布林改變過。
   *
   * **逐欄比較，即使今天有三欄是多餘的**：那三欄現在恰好與疏密共用同一道分界，
   * 所以少比它們今天也不會錯。但下一個把某一件事挪到第三道分界上的人，
   * 不會記得回來改這裡——而漏掉的那一欄不會報錯，只會讓畫面停在上一個答案上。
   */
  sameAs(other: LayoutDensityDto): boolean {
    return this.density === other.density
      && this.usesBottomNavigation === other.usesBottomNavigation
      && this.allowsBlockEditing === other.allowsBlockEditing
      && this.startsChartControlsCollapsed === other.startsChartControlsCollapsed
      && this.assistantCoversScreen === other.assistantCoversScreen
  }
}
