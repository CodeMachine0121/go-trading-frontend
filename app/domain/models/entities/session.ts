import { SessionDomain } from '~/domain/models/domains/session-domain'

/**
 * Entity：這台瀏覽器手上的一段登入階段——**一對**憑證，各自帶著自己的到期時刻。
 *
 * 它取代了只裝一份憑證的舊形狀。名字換掉而不是欄位加上去，因為它裝的已經不是
 * 「一份登入憑證」了：沿用舊名，每個讀到它的人都會先誤會一次。
 *
 * 兩個到期時刻都收下來，不是為了顯示給誰看，而是為了**能先算出來的答案就不必去問**：
 * 一份自己就知道已經過期的憑證，拿去問後端只是一趟結論早就確定的來回。
 */
export class Session {
  constructor(
    public readonly accessToken: string,
    public readonly accessTokenExpiresAt: Date,
    public readonly refreshToken: string,
    public readonly refreshTokenExpiresAt: Date,
  ) {}

  toDomain(): SessionDomain {
    return new SessionDomain(this)
  }
}
