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
}
