import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：這個電子郵件已經有人用了。
 *
 * 它自成一種而不併進一般的拒絕，是因為畫面對它的反應不同：內容沒有錯，
 * 只是這個位址被佔用了——**兩格的內容都要留著**，讓人改一個位址再送一次，
 * 或是直接切到登入。
 */
export class EmailAlreadyRegisteredError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'EmailAlreadyRegisteredError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
