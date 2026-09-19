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
    /** 導覽現在是一片叫得出來的抽屜（而不是一條固定側欄）。 */
    public readonly usesNavigationDrawer: boolean,
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
}
