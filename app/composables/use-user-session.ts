import type { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import type { CredentialsFieldErrorsDto } from '~/domain/models/dto/credentials-field-errors-dto'
import type { SignInMode } from '~/domain/models/vo/sign-in-mode'
import { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import { CredentialsFieldError } from '~/domain/errors/credentials-field-error'
import { CredentialsRejectedError } from '~/domain/errors/credentials-rejected-error'
import { EmailAlreadyRegisteredError } from '~/domain/errors/email-already-registered-error'
import { AccessTokenUnavailableError } from '~/domain/errors/access-token-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 沒有「原本想去的那一頁」時，登入成功要去哪。 */
export const HOME_PATH = '/'

/** 登入畫面的位址。把關與登入那一頁都得說得出它，所以它只寫在這裡一次。 */
export const LOGIN_PATH = '/login'

/**
 * 全站共用的「現在是誰在用」。
 *
 * 這個問題會被三個互不相干的地方問到：把關的中介層（要不要放行）、
 * 登入畫面（要不要讓開）、側欄（顯示誰）。三個地方各問一次後端，
 * 就會出現三個可能互相矛盾的答案，還會在每次換頁多打兩趟。
 * 所以它是一份跨畫面共用的狀態，第一次被問到時才去確認一次——
 * 與 useBackendHealth 對「後端還活著嗎」的做法完全一樣。
 */
export function useUserSession(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個，因此畫面端照樣
   * 一個參數都不必給——它存在的唯一理由是讓這裡的編排測得到：
   * 確認只做一次、連不上後端時不拋而是當作沒登入、被擋下來的原因掛回該格、
   * 登出要把共用狀態清乾淨，這幾條都是規則，不是接線。
   *
   * 換掉 useNuxtApp 本身是行不通的：測試環境自己也要用它，換掉它會連
   * 路由同步一起弄壞。
   */
  userSessionApplication = useNuxtApp().$userSessionApplication,
) {
  const currentUser = useState<SignedInUserDto | null>('user-session', () => null)
  /**
   * 正在進行（或已經完成）的那一次確認。
   *
   * 存的是**那個進行中的動作**而不是一個「問過了沒」的布林，因為布林有兩個各自會出事的空隙：
   * 它必須在動作**開始**時就設起來（否則兩次同時的確認會各打一趟後端），而一旦這樣，
   * 在答案回來之前問的人就會拿到一個很肯定的「沒登入」——然後被帶到登入畫面，
   * 而真正的答案回來時已經沒有人在等它了。存下這個動作本身，晚到的人就會排在同一個答案後面。
   */
  const restoration = useState<Promise<void> | null>('user-session-restoration', () => null)
  const pending = useState('user-session-pending', () => false)
  const errorMessage = useState<string | null>('user-session-error', () => null)
  const fieldErrors = useState<CredentialsFieldErrorsDto | null>(
    'user-session-field-errors', () => null)
  const redirectTo = useState<string | null>('user-session-redirect-to', () => null)
  const signingOut = useState('user-session-signing-out', () => false)

  /**
   * 確認這台瀏覽器記著的憑證認不認得出人來，**一個分頁只做一次**。
   *
   * 它不拋。把關要靠它決定放不放行，而一個會拋的把關等於換頁到一半整個停住——
   * 後端沒開的時候，正確的行為是把人帶到登入畫面並在那裡說明，不是白畫面。
   */
  async function ensureSessionRestored(): Promise<void> {
    restoration.value ??= restoreOnce()

    await restoration.value
  }

  /**
   * 真正去確認一次。
   *
   * 問不出答案時**把這次確認忘掉**，讓下一次換頁重新問一次。留著的話，一個只是
   * 「後端還沒啟動」的暫時狀況會變成這個分頁的永久狀態：後端起來了，使用者按遍每一頁
   * 也回不去，只能整個重新載入——而畫面上那句話只叫他去啟動後端，沒說還要重新整理。
   */
  async function restoreOnce(): Promise<void> {
    try {
      currentUser.value = await userSessionApplication.restoreSession(new Date())
    }
    catch (error: unknown) {
      currentUser.value = null
      errorMessage.value = messageFor(error)
      restoration.value = null
    }
  }

  /**
   * 送出登入畫面那兩格，成功就把人放回他本來要去的地方。
   *
   * 換頁包在裡面，而不是交給呼叫端「成功的話再自己換一次」：那樣的話
   * 「登入」這一件事會被拆成兩次呼叫，而漏掉第二次的畫面會停在原地，
   * 看起來像什麼都沒發生。失敗的原因留在 errorMessage 與 fieldErrors 上。
   */
  async function submitCredentials(
    email: string, password: string, mode: SignInMode,
  ): Promise<void> {
    if (pending.value) {
      return
    }

    pending.value = true
    errorMessage.value = null
    fieldErrors.value = null

    try {
      const credentialsDto = new CredentialsDto(email, password, mode)
      currentUser.value = mode === 'register'
        ? await userSessionApplication.registerUser(credentialsDto)
        : await userSessionApplication.signIn(credentialsDto)

      // 被門擋下來的人想去的是門後面的某個地方，不是門廳。
      //
      // 換頁**在放開那顆鍵之前**完成。反過來的話，換頁還在進行的那段時間裡畫面仍然是
      // 登入卡片，而那顆鍵已經能按了——按一下 Enter 就會再送一次，開出第二段登入階段，
      // 而第一段的續用憑證從此沒有人撤得掉。
      await navigateTo(takeRedirectTo())
    }
    catch (error: unknown) {
      if (error instanceof CredentialsFieldError) {
        fieldErrors.value = error.fieldErrors
      }
      else {
        errorMessage.value = messageFor(error)
      }
    }
    finally {
      pending.value = false
    }
  }

  /** 記下他本來要去哪，好在登入成功後把他放回那裡。 */
  function rememberRedirectTo(path: string): void {
    redirectTo.value = path
  }

  /**
   * 取出並用掉「原本想去的那一頁」；沒有就回首頁。用掉之後就忘記，
   * 否則下一次登入會被上一次的目的地牽著走。
   */
  function takeRedirectTo(): string {
    const path = redirectTo.value ?? HOME_PATH
    redirectTo.value = null

    return path
  }

  /** 清掉卡片上那一則訊息——切換模式時它講的已經是上一件事了。 */
  function clearSubmissionFeedback(): void {
    errorMessage.value = null
    fieldErrors.value = null
  }

  /**
   * 登出：丟掉憑證、把共用狀態清乾淨，然後回到登入畫面。
   *
   * 清乾淨是必要的，不是禮貌：這份狀態跨畫面共用，留著上一個人的電子郵件，
   * 側欄就會繼續顯示他。
   *
   * 換頁也在這裡，而不是留給五個畫面各寫一次：忘了寫的那一頁會停在原地，
   * 看起來像登出失敗了。
   */
  async function signOut(): Promise<void> {
    // 連按兩下不能送出兩次。第二次會從儲存讀到**同一份**續用憑證（第一次還沒清掉），
    // 於是同一份憑證被送去撤銷兩次——而後端把「同一份出現兩次」讀成盜用。
    if (signingOut.value) {
      return
    }

    signingOut.value = true

    // 登出現在要跑一趟後端（去撤掉這台裝置的登入階段）。它不會失敗——
    // 後端沒開時 service 會吞掉，因為登出在畫面上一定要成功。
    await userSessionApplication.signOut()
    currentUser.value = null
    redirectTo.value = null
    clearSubmissionFeedback()
    restoration.value = null
    signingOut.value = false

    await navigateTo(LOGIN_PATH)
  }

  return {
    currentUser,
    pending,
    errorMessage,
    fieldErrors,
    ensureSessionRestored,
    submitCredentials,
    rememberRedirectTo,
    clearSubmissionFeedback,
    signOut,
  }
}

/**
 * 哨兵錯誤分流：等同後端 controller 把領域錯誤對映成狀態碼。
 * 三個取用它的地方要說同一句話，所以這句話寫在這裡，不寫在畫面上。
 */
function messageFor(error: unknown): string {
  if (error instanceof CredentialsRejectedError || error instanceof EmailAlreadyRegisteredError) {
    // 這兩種後端已經講得夠清楚了，原文轉達即可——多一層轉譯只會多一個會漂移的地方。
    return error.message
  }

  if (error instanceof AccessTokenUnavailableError) {
    return '後端目前簽不出登入憑證（尚未設定 AUTH_ACCESS_TOKEN_SIGNING_KEY），這不是你填錯了什麼。'
  }

  if (error instanceof BackendUnreachableError) {
    return '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。'
  }

  return '登入時發生未預期的錯誤。'
}
