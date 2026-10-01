import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * VO：一句不是操作台寫的話——後端回覆的原文。不論顯示語言是哪一個都原樣呈現。
 *
 * 它仍是一個 `LocalizedTextVo`，畫面因此只需要認得一種「要說的話」；
 * 只是兩種說法是同一段字，翻譯這件事在它身上不會發生。
 */
export class UntranslatedTextVo extends LocalizedTextVo {
  constructor(text: string) {
    super(text, text)
  }
}
