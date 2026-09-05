import type { Session } from '~/domain/models/entities/session'
import type { SignedInUser } from '~/domain/models/entities/signed-in-user'

/**
 * 介面以「能力」命名：這個能力是「向後端建立帳號、開一段登入階段、續用它、結束它，
 * 以及問出我是誰」。實作在 app/infrastructure/proxy/user-proxy.ts。
 *
 * 五件事收在同一個 proxy，因為它們是同一個後端資源的五條路——
 * 一個外部資源一個 Proxy，不拆 reader / writer。
 */
export interface IUserProxy {
  /** 建立一位使用者。回覆識別碼與電子郵件，永遠不含密碼或由它算出來的任何東西。 */
  registerUser(email: string, password: string): Promise<SignedInUser>

  /** 登入。對得上就開一段登入階段，拿到**一對**憑證與各自的到期時刻。 */
  signIn(email: string, password: string): Promise<Session>

  /**
   * 拿續用憑證換一對全新的。舊的那一份在後端當場作廢，所以**這件事不可以重試**——
   * 續用憑證只能用一次，再送一次會被後端判定為盜用，連帶把這台裝置整條登入階段撤掉。
   *
   * 憑證不算數時拋 AuthenticationRequiredError，與「我是誰」被拒絕是同一種：
   * 對持有者而言那是同一件事，就是得重新登入。
   */
  renewSession(refreshToken: string): Promise<Session>

  /**
   * 請後端撤掉這台裝置的登入階段。
   *
   * **它允許失敗。** 後端沒開的時候，登出在畫面上仍然必須成功——做不到的只是
   * 「立刻讓後端也忘記」，而使用者能做的只有稍後再登出一次，那不值得攔住他。
   */
  revokeSession(refreshToken: string): Promise<void>

  /** 帶著登入憑證問「我是誰」。憑證不算數時拋 AuthenticationRequiredError。 */
  fetchSignedInUser(accessToken: string): Promise<SignedInUser>
}
