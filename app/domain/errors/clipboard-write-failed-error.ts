import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 哨兵錯誤：寫不進剪貼簿。
 *
 * 瀏覽器不見得讓寫：不是安全連線、沒有權限、或使用者的按下沒有被算成一次
 * 「使用者動作」。這幾種對使用者是同一件事——**這一次沒複製到**，
 * 而畫面必須說出來，否則他會帶著一個空的剪貼簿去貼上。
 */
export class ClipboardWriteFailedError extends Error {
  readonly localizedMessage: LocalizedTextVo

  constructor(localizedMessage: LocalizedTextVo, options?: { cause?: unknown }) {
    super(localizedMessage.traditionalChinese, options)
    this.name = 'ClipboardWriteFailedError'
    this.localizedMessage = localizedMessage
  }
}
