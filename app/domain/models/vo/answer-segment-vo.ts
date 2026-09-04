/** 一段行內文字是哪一種：普通、被強調的、還是代號那類要以等寬字呈現的。 */
export type AnswerSegmentKind = 'text' | 'strong' | 'code'

/**
 * VO：一則回答裡的一段行內文字。不可變、無行為。
 *
 * 它刻意**不帶任何網頁概念**——沒有標籤名、沒有 class。要用什麼畫出來是元件的事；
 * 這裡只說「這一段是普通的／要重一點／是代號」。
 *
 * 這個分界正是「回答內容不可能被當成指令執行」的來源：
 * 助手回的東西一路到畫面都只是文字加上一個種類，中間沒有任何一處把它當成標記解讀。
 */
export class AnswerSegmentVo {
  constructor(
    public readonly kind: AnswerSegmentKind,
    public readonly text: string,
  ) {}
}
