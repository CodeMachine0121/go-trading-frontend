import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 後端回應失敗時的原始形狀。go-trading 一律以 `{"message": "..."}` 說明拒絕的原因。
 * 與 wire 型別同理：描述的是外部契約，只存在於本檔內、不外流進 domain。
 */
type BackendFailure = {
  response?: { status: number }
  data?: { message?: string }
}

type BackendRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string>
  body?: Record<string, string | number>
}

/**
 * 所有打 go-trading 的 proxy 共用的請求執行與錯誤翻譯。
 *
 * 「後端以業務規則拒絕」與「連不上後端」對使用者的意義完全不同（改輸入 vs 去啟動後端），
 * 這條翻譯規則必須所有 proxy 一致；分散在各自的 try/catch 只會養出三份會漂移的複本。
 */
export abstract class BackendApiProxy {
  // abstract 類別本身無法被實例化，因此建構子維持公開，交給各 proxy 直接繼承使用。
  constructor(private readonly baseUrl: string) {}

  protected async requestBackend<TWire>(
    path: string,
    options: BackendRequestOptions = {},
  ): Promise<TWire> {
    const endpoint = `${this.baseUrl}${path}`

    try {
      return await $fetch<TWire>(endpoint, options)
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
          throw new BackendRequestRejectedError(
            backendFailure.data?.message ?? error.message,
            { cause: error },
          )
        }
      }

      throw new BackendUnreachableError(endpoint, { cause: error })
    }
  }
}
