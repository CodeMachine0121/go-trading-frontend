import type { IClipboardProxy } from '~/domain/interface/i-clipboard-proxy'
import { ClipboardWriteFailedError } from '~/domain/errors/clipboard-write-failed-error'

/**
 * Proxy：瀏覽器的剪貼簿。
 *
 * 它是這個專案裡除了後端與瀏覽器儲存之外的第三種外部資源，所以一樣收在 proxy 裡——
 * 元件不直接碰 `navigator`，理由與不直接碰 `$fetch` 相同：那條路一旦散開，
 * 「寫不進去要說什麼」就會有好幾種說法。
 *
 * **寫不進去不是靜靜失敗。** 剪貼簿在非安全連線、權限被拒、或這次點擊沒被算成
 * 一次使用者動作時都會拒絕；使用者若不知道，他會帶著一個空的剪貼簿去貼上，
 * 然後以為是貼上的地方壞了。
 */
export class ClipboardProxy implements IClipboardProxy {
  async writeText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
    }
    catch (error: unknown) {
      throw new ClipboardWriteFailedError('複製失敗，請手動選取這段內容。', { cause: error })
    }
  }
}
