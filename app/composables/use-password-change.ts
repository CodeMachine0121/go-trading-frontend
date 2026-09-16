import { PasswordChangeFieldErrorsDto } from '~/domain/models/dto/password-change-field-errors-dto'
import { PasswordChangeFieldError } from '~/domain/errors/password-change-field-error'
import { CurrentPasswordRejectedError } from '~/domain/errors/current-password-rejected-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 設定畫面上「更換密碼」那一張卡的狀態與編排。
 *
 * 它的狀態不與另外兩張卡共用：一張卡出錯不該讓另外兩張看起來也壞了。
 *
 * 成功之後由它把人帶走——不說一聲就把人踢回登入畫面，看起來像換失敗了，
 * 而那個人其實已經換好了。
 */
export function usePasswordChange(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個，因此畫面端照樣
   * 一個參數都不必給；它存在的唯一理由是讓這裡的編排測得到。
   */
  passwordChangeApplication = useNuxtApp().$passwordChangeApplication,
  /**
   * 換好之後要把人帶去哪。它與上面那個參數存在的理由相同：讓這裡的編排測得到——
   * 「換成功要留一句話、忘掉記著的那一對、然後回登入畫面」是規則，不是接線。
   */
  userSession = useUserSession(),
) {
  const pending = ref(false)
  const errorMessage = ref<string | null>(null)
  const fieldErrors = ref<PasswordChangeFieldErrorsDto | null>(null)

  /**
   * 送出一次換密碼，成功就把人帶回登入畫面。
   *
   * 連按兩下不能送出兩次。第二次帶的是**已經失效的舊密碼**，於是使用者會看到
   * 一句「目前的密碼不正確」——而他的密碼其實已經換好了。
   */
  async function submitPasswordChange(
    currentPassword: string, newPassword: string, newPasswordConfirmation: string,
  ): Promise<void> {
    if (pending.value) {
      return
    }

    pending.value = true
    errorMessage.value = null
    fieldErrors.value = null

    try {
      await passwordChangeApplication.changePassword(
        currentPassword, newPassword, newPasswordConfirmation)

      // 換頁包在裡面而不是交給呼叫端「成功的話再自己走一次」：漏掉第二步的畫面
      // 會停在原地，看起來像什麼都沒發生——而後端那一側已經把他登出了。
      await userSession.signOutAfterPasswordChange()
    }
    catch (error: unknown) {
      applyFailure(error)
    }
    finally {
      pending.value = false
    }
  }

  /** 清掉卡片上那些訊息——使用者又動了那幾格，上一次的說明講的已經是上一件事。 */
  function clearFeedback(): void {
    errorMessage.value = null
    fieldErrors.value = null
  }

  /**
   * 把失敗掛回它該去的地方。
   *
   * 「目前的密碼不正確」掛回那一格而不是丟一句籠統的紅字，因為使用者要改的正是那一格。
   * 後端擋下來的其他規則（理論上這一側都先判過了）一律掛到「新的密碼」——不猜，
   * 也不讀訊息文字去分辨是哪一條。
   */
  function applyFailure(error: unknown): void {
    if (error instanceof PasswordChangeFieldError) {
      fieldErrors.value = error.fieldErrors
      return
    }

    if (error instanceof CurrentPasswordRejectedError) {
      fieldErrors.value = new PasswordChangeFieldErrorsDto(error.message, null, null)
      return
    }

    if (error instanceof BackendRequestRejectedError) {
      fieldErrors.value = new PasswordChangeFieldErrorsDto(null, error.message, null)
      return
    }

    errorMessage.value = messageFor(error)
  }

  return { pending, errorMessage, fieldErrors, submitPasswordChange, clearFeedback }
}

/** 這一張卡對「不是某一格的錯」的那幾種失敗會說的話。 */
function messageFor(error: unknown): string {
  if (error instanceof BackendUnreachableError) {
    return '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。'
  }

  return '更換密碼時發生未預期的錯誤。'
}
