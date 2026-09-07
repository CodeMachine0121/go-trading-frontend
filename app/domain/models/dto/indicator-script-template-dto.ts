/**
 * DTO：算式編輯器要的三樣東西——唯讀外框、一段可直接執行的範例主體、
 * 以及開新的空白策略時預填的那個 stub。
 *
 * 三樣一起給，是因為畫面每次只在「種類換了」這一個時機需要它們；
 * 拆成三次呼叫只會讓畫面自己去記得要問齊。
 */
export class IndicatorScriptTemplateDto {
  constructor(
    /** 唯讀外框：package 宣告與三個匯入，七行固定內容。唯讀呈現在主體上方。 */
    public readonly frameHeader: string,
    /** 這個種類可直接執行的範例主體——整個 `Calculate` 函式。 */
    public readonly exampleBody: string,
    /** 開新的空白策略時，可編輯區預填的那個空 `Calculate`——回傳型別跟著這個種類。 */
    public readonly blankBody: string,
  ) {}

  /** 唯讀外框佔掉的行數。 */
  get frameHeaderLineCount(): number {
    return this.frameHeader.split('\n').length
  }

  /**
   * 使用者寫的第一行，在整段算式裡是第幾行。
   *
   * 外框之後留一個空行（Go 慣例），所以主體從外框行數再加二開始。
   * 後端說「第 N 行出錯」時使用者數得到同一行。
   */
  get bodyStartLineNumber(): number {
    return this.frameHeaderLineCount + 2
  }
}
