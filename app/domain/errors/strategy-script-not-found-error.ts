import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：指名的那一支策略腳本不存在（例如它已經在別處被刪掉）。
 *
 * 它自成一種，是因為「找不到那一支」與「內容不合規則」是兩件不同的事：
 * 前者改內容沒有用，後者改了就能過。混為一談會把使用者帶往錯的方向。
 */
export class StrategyScriptNotFoundError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StrategyScriptNotFoundError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
