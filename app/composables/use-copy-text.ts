import { ClipboardWriteFailedError } from '~/domain/errors/clipboard-write-failed-error'
import type { ClipboardApplication } from '~/application/clipboard-application'

/** 複製成功之後那個勾停留多久。 */
const COPIED_FEEDBACK_MILLISECONDS = 2000

/** 這一顆複製鍵現在的樣子。 */
export type CopyState = 'idle' | 'copied' | 'failed'

/**
 * 複製一段文字，並記著剛才那一下的結果。
 *
 * 它**不是共用狀態**——每一顆複製鍵各自記自己的。共用一份的話，按了某一段程式碼
 * 旁邊那顆，畫面上每一顆都會同時打勾，而使用者會不知道自己到底複製了哪一段。
 *
 * 成功後那個勾會自己退回去：一顆永遠打著勾的鍵，下一次按下去就看不出有沒有反應。
 */
export function useCopyText(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個；
   * 它存在的理由與其他幾支相同：讓這裡的編排測得到。
   */
  clipboardApplication: ClipboardApplication = useNuxtApp().$clipboardApplication,
) {
  const state = ref<CopyState>('idle')
  const failureMessage = ref<string | null>(null)

  let resetTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleReset(): void {
    if (resetTimer !== null) {
      clearTimeout(resetTimer)
    }

    resetTimer = setTimeout(() => {
      state.value = 'idle'
      failureMessage.value = null
    }, COPIED_FEEDBACK_MILLISECONDS)
  }

  /**
   * 複製這段文字。
   *
   * 空的一段什麼都不做（domain 那條規則），連狀態都不動——按了一顆沒有東西可複製的鍵，
   * 打勾會是一句謊話。
   */
  async function copyText(text: string): Promise<void> {
    try {
      const copied = await clipboardApplication.copyText(text)
      if (!copied) {
        return
      }

      state.value = 'copied'
      failureMessage.value = null
    }
    catch (error: unknown) {
      state.value = 'failed'
      failureMessage.value = error instanceof ClipboardWriteFailedError
        ? error.message
        : '複製失敗，請手動選取這段內容。'
    }

    scheduleReset()
  }

  // 那顆鍵被收掉之後，計時器還在的話會去改一個已經不存在的東西。
  onBeforeUnmount(() => {
    if (resetTimer !== null) {
      clearTimeout(resetTimer)
    }
  })

  return { state, failureMessage, copyText }
}
