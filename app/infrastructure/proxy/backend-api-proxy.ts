import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { SignedOutError } from '~/domain/errors/signed-out-error'
import { CandleCoverageShortfallVo } from '~/domain/models/vo/candle-coverage-shortfall-vo'

/**
 * 後端回應失敗時的原始形狀。go-trading 一律以 `{"message": "..."}` 說明拒絕的原因。
 * 與 wire 型別同理：描述的是外部契約，只存在於本檔內、不外流進 domain。
 */
type BackendFailure = {
  response?: { status: number }
  data?: {
    message?: string
    parameterName?: string
    field?: string
    availableCandleCount?: number
    minimumCandleCount?: number
    observationWindowHoldsNoTrading?: boolean
  }
}

/** 從這個狀態碼開始，代表問題出在後端自己身上，不是這次請求的內容。 */
const SERVER_ERROR_STATUS_FLOOR = 500

/** 後端用這個狀態碼說「這一次沒有帶著有效的身分」。 */
const SIGNED_OUT_STATUS = 401

type BackendRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string>
  /**
   * 送出去的內容。值可以是一個巢狀的清單（例如策略的那一份旋鈕），
   * 但仍然逐項具名——沒有一個「什麼都能裝」的位置。
   *
   * null 是一個真的值而不是「沒填」：後端有幾個欄位可以是**沒有這一項**，
   * 而那與送 0 或整個省略都不是同一件事。
   */
  body?: Record<string, string | number | null | readonly Record<string, string | number>[]>
  /**
   * 這一次請求要多帶的標頭。
   *
   * 身分**不再走這裡**：每一發都帶著它，統一由下面附上。這個選項留給真正只屬於某一次
   * 請求的標頭；目前沒有人用得到。
   */
  headers?: Record<string, string>
  /**
   * 這一發被回「沒有帶著有效的身分」時，代表的是「這一次登入過期了」嗎？
   *
   * 預設是。唯一的例外是**建立身分的那幾條路**：登入被拒代表帳密對不上，
   * 續用被拒代表那份續用憑證不算數了，問「我是誰」被拒代表這台記著的那一份不算數了——
   * 三者都是那一次請求自己的答案，不是一段正在用的登入忽然失效。
   * 把它們也當成過期，會在登入畫面上把「密碼打錯」演成一次被登出。
   */
  refusalMeansSignedOut?: boolean
}

/**
 * 所有打 go-trading 的 proxy 共用的請求執行與錯誤翻譯。
 *
 * 「後端以業務規則拒絕」與「連不上後端」對使用者的意義完全不同（改輸入 vs 去啟動後端），
 * 這條翻譯規則必須所有 proxy 一致；分散在各自的 try/catch 只會養出三份會漂移的複本。
 */
export abstract class BackendApiProxy {
  /**
   * abstract 類別本身無法被實例化，因此建構子維持公開，交給各 proxy 直接繼承使用。
   *
   * 身分與「被登出時要做什麼」都在這裡收下，而不是每個 proxy 各自處理：後端現在每一條與
   * 這個人有關的路都要身分，而「只要有一條路忘了帶」就是一個洞——洞不會有人發現，
   * 因為那條路平常也很少走。寫在這裡，九個 proxy 一個都不必改，也一個都漏不掉。
   */
  constructor(
    private readonly baseUrl: string,
    private readonly sessionStorageProxy: ISessionStorageProxy,
    /**
     * 被登出時要做的事——通常是清掉全站共用的那份狀態並回到登入畫面。
     *
     * 它是一個回呼而不是一個介面，因為那不是一份資料，也不是一個外部資源：
     * 它是**應用程式的編排**，而發請求的東西不該懂得導頁。由組裝根給進來，
     * 那裡本來就是唯一知道全部具體型別的地方。
     */
    private readonly onSignedOut: () => void = () => {},
    /**
     * 試著把這一段登入救回來，救回來了回 `true`。
     *
     * 它存在是因為**登入憑證只活十五分鐘，而續用憑證活三十天**。少了它，坐在圖表前
     * 十六分鐘之後按一下計算，就會被踢回登入畫面——而手上那份續用憑證明明還好著。
     * 這一發本來只是過期，不是「這個人不算數了」。
     *
     * 它必須**同時只跑一次**（這件事由給進來的那一邊保證）：續用憑證用過就失效，
     * 同時換兩次會被後端判定為盜用，把「這台需要重登」升級成「這個人每一台都被登出」。
     */
    private readonly recoverSession: () => Promise<boolean> = async () => false,
  ) {}

  protected async requestBackend<TWire>(
    path: string,
    options: BackendRequestOptions = {},
  ): Promise<TWire> {
    return this.sendRequest<TWire>(path, options, true)
  }

  /**
   * 真正發出去的那一次，外加「這一發還准不准為了過期再試一次」。
   *
   * 它是私有的，而且**只被兩個地方呼叫：上面那一個，以及它自己**——那個界線就是它存在的
   * 理由。重試次數不是一個可以調的數字，是遞迴時把那個許可交出去：第二發帶著 `false`，
   * 所以「最多再試一次」寫在結構裡，不在一個總有一天會被調成二的計數器裡。
   */
  private async sendRequest<TWire>(
    path: string,
    options: BackendRequestOptions,
    mayRenew: boolean,
  ): Promise<TWire> {
    const endpoint = `${this.baseUrl}${path}`

    try {
      return await $fetch<TWire>(endpoint, {
        ...options,
        headers: { ...this.identityHeaders(), ...options.headers },
      })
    }
    catch (error: unknown) {
      // 後端有回應（不論幾百）代表它活著，只是拒絕了這次請求；連回應都沒有才是連不上。
      //
      // 注意：底層的 FetchError **一律**帶著 response 這個屬性（連不上時它的值是 undefined），
      // 因此這裡必須判斷「有沒有回應物件」，不能判斷「有沒有這個屬性」——
      // 後者恆為真，會把「後端沒啟動」誤判成「後端拒絕」。
      if (error instanceof Error) {
        const backendFailure = error as BackendFailure
        if (backendFailure.response !== undefined) {
          const message = backendFailure.data?.message ?? error.message

          // 「請重新登入」要在所有其他翻譯之前認出來，因為它是唯一一種**改請求也沒用**
          // 的拒絕：使用者要做的是重新登入。混在一般拒絕裡，畫面就會請他去修一份
          // 從來沒錯的請求。
          if (backendFailure.response.status === SIGNED_OUT_STATUS
            && (options.refusalMeansSignedOut ?? true)) {
            // 先試著救回來，再考慮把人趕回登入畫面。**這個順序就是這段程式的意義**：
            // 登入憑證十五分鐘就過期，續用憑證還有三十天——十六分鐘之後按一下計算
            // 就被登出，是把一件系統自己修得好的事，變成使用者的麻煩。
            //
            // 救回來之後重發一次，而不是把失敗回報上去讓畫面自己重試：呼叫端根本不知道
            // 剛才那一發是因為過期才失敗的，而每一個呼叫端各自記得重試一次，
            // 就是同一段規則寫十遍。
            if (mayRenew && await this.recoverSession()) {
              return await this.sendRequest<TWire>(path, options, false)
            }

            // 救不回來了。記著的那一份已經不算數，留著它下一發還是會被擋，
            // 而把關那一道門會繼續以為這個人登入著。
            this.sessionStorageProxy.clearSession()
            this.onSignedOut()

            throw new SignedOutError(message, { cause: error })
          }

          // 後端自己壞掉時，使用者改什麼都沒用——不能說成「你的請求有問題」。
          if (backendFailure.response.status >= SERVER_ERROR_STATUS_FLOOR) {
            throw new BackendServerError(message, {
              cause: error,
              status: backendFailure.response.status,
            })
          }

          // 那兩個根數**要兩個都在才成立**：半組數字說不出那句話——只知道
          // 「湊得出 19」講不出差多少，只知道「至少要 20」講不出現在有幾根。
          // 所以缺一個就當它沒說，讓這次拒絕走一般的那條路。
          const availableCandleCount = backendFailure.data?.availableCandleCount
          const minimumCandleCount = backendFailure.data?.minimumCandleCount
          const candleCoverageShortfall
            = availableCandleCount === undefined || minimumCandleCount === undefined
              ? undefined
              : new CandleCoverageShortfallVo(availableCandleCount, minimumCandleCount)

          throw new BackendRequestRejectedError(
            message,
            {
              cause: error,
              status: backendFailure.response.status,
              parameterName: backendFailure.data?.parameterName,
              field: backendFailure.data?.field,
              candleCoverageShortfall,
              // 一個布林就說得完：這一種拒絕沒有任何數字調得動。
              marketClosedThroughout:
                backendFailure.data?.observationWindowHoldsNoTrading ?? false,
            },
          )
        }
      }

      throw new BackendUnreachableError(endpoint, { cause: error })
    }
  }

  /**
   * 這一發要帶的身分。沒有記著任何一段登入時**什麼都不帶**——那與帶一個空的憑證不同：
   * 開放的那幾條路（K 線、交易標的）照樣答得出來，而需要身分的那幾條會拒絕，
   * 這正是我們要的。
   */
  private identityHeaders(): Record<string, string> {
    const session = this.sessionStorageProxy.readSession()
    if (session === null) {
      return {}
    }

    return { Authorization: `Bearer ${session.accessToken}` }
  }
}
