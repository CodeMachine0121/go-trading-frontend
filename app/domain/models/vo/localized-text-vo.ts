import type { DisplayLanguageCodeVo } from '~/domain/models/vo/display-language-code-vo'

/**
 * VO：一句由領域規則說出來的話，同時帶著每一個可選語言的說法。
 *
 * domain 不認識畫面用的翻譯機制，所以說法寫在說出它的規則旁邊——改規則時兩種說法一起改，
 * 不可能只改了一種語言。畫面渲染的當下才照目前的語言挑一種，換語言時已經顯示的話跟著換。
 *
 * 不是操作台自己寫的話（後端回覆的原文）兩種說法是同一段字：原樣呈現，不翻。
 */
export class LocalizedTextVo {
  constructor(
    public readonly traditionalChinese: string,
    public readonly english: string,
  ) {}

  in(language: DisplayLanguageCodeVo): string {
    return language === 'en' ? this.english : this.traditionalChinese
  }
}
