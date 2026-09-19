/**
 * DTO：算式編輯器要的兩樣東西——一份可直接執行的範例算式，以及開新的空白策略腳本時
 * 預填的那一份。
 *
 * 兩樣一起給，是因為畫面每次只在「種類換了」這一個時機需要它們；
 * 拆成兩次呼叫只會讓畫面自己去記得要問齊。
 *
 * **兩份都是一整份算式**，含最上面的宣告與匯入：畫面不再替使用者接合任何東西，
 * 填進編輯區的那一份就是送得出去的那一份。
 */
export class IndicatorScriptTemplateDto {
  constructor(
    /** 這個種類可直接執行的範例算式——開頭那幾行加整個 `Calculate` 函式。 */
    public readonly exampleScript: string,
    /** 開新的空白策略腳本時預填的那一份——開頭那幾行加一個空的 `Calculate`。 */
    public readonly blankScript: string,
  ) {}
}
