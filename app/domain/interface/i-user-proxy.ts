import type { AccessToken } from '~/domain/models/entities/access-token'
import type { SignedInUser } from '~/domain/models/entities/signed-in-user'

/**
 * 介面以「能力」命名：這個能力是「向後端建立帳號、登入，以及問出我是誰」。
 * 實作在 app/infrastructure/proxy/user-proxy.ts。
 *
 * 三件事收在同一個 proxy，因為它們是同一個後端資源的三條路——
 * 一個外部資源一個 Proxy，不拆 reader / writer。
 */
export interface IUserProxy {
  /** 建立一位使用者。回覆識別碼與電子郵件，永遠不含密碼或由它算出來的任何東西。 */
  registerUser(email: string, password: string): Promise<SignedInUser>

  /** 登入。對得上就拿到一份登入憑證與它的到期時刻。 */
  signIn(email: string, password: string): Promise<AccessToken>

  /** 帶著憑證問「我是誰」。憑證不算數時拋出 AuthenticationRequiredError。 */
  fetchSignedInUser(accessToken: string): Promise<SignedInUser>
}
