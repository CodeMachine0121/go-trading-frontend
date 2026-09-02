/**
 * DTO：一個指標值種類之下，算式長什麼樣。
 *
 * 外框的頭尾與範例內容一起給，是因為畫面每次只在「種類換了」這一個時機需要它們；
 * 拆成三次呼叫只會讓畫面自己去記得要問齊。
 */
export class IndicatorScriptTemplateDto {
  constructor(
    /** 外框的開頭：套件宣告、匯入、進入點簽章。唯讀呈現在內容上方。 */
    public readonly frameHeader: string,
    /** 外框的結尾。唯讀呈現在內容下方。 */
    public readonly frameFooter: string,
    /** 這個種類可直接執行的範例內容。 */
    public readonly exampleBody: string,
  ) {}

  /** 外框開頭佔掉的行數。 */
  get frameHeaderLineCount(): number {
    return this.frameHeader.split('\n').length
  }

  /**
   * 使用者寫的第一行，在整段算式裡是第幾行。
   * 畫面照這個號碼接續編號，後端說「第 12 行出錯」時使用者數得到同一行。
   */
  get bodyStartLineNumber(): number {
    return this.frameHeaderLineCount + 1
  }
}
