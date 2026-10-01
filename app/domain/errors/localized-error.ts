import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 所有哨兵錯誤的共同底：每一種失敗都帶著畫面要說的那一句。
 *
 * `message` 是繁體中文那一份，給記錄與除錯看；畫面一律讀 `localizedMessage`，
 * 換語言時已經顯示的錯誤才跟著換。後端原文以 `UntranslatedTextVo` 帶進來，不翻。
 */
export class LocalizedError extends Error {
  constructor(public readonly localizedMessage: LocalizedTextVo, options?: ErrorOptions) {
    super(localizedMessage.traditionalChinese, options)
  }
}
