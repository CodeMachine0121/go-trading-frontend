import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import type { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import type { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import type { SessionDomain } from '~/domain/models/domains/session-domain'
import { CredentialsDomain } from '~/domain/models/domains/credentials-domain'
import { CredentialsFieldError } from '~/domain/errors/credentials-field-error'
import { AuthenticationRequiredError } from '~/domain/errors/authentication-required-error'

/**
 * Domain Service：「現在是誰在用」這件事的唯一入口。
 * 四個公開用例互不呼叫。
 *
 * 這一版新增的全部是**修復**：登入憑證過期時自己去換一份，被拒絕時試一次。
 * 它對外的形狀一個字都沒變，所以 composable、把關中介層、每一個畫面都不必動——
 * 那正是這層邊界當初畫對了的證據。
 */
export class UserSessionService {
  constructor(
    private readonly userProxy: IUserProxy,
    private readonly sessionStorageProxy: ISessionStorageProxy,
  ) {}

  /**
   * 建立帳號，成功之後**直接就是登入狀態**。
   *
   * 後端的建立只回覆一位使用者、不開登入階段，所以這裡緊接著登入一次。
   * 讓使用者自己再填一次同樣的兩格是說不過去的——他兩秒前才打完。
   */
  async registerUser(credentialsDto: CredentialsDto): Promise<SignedInUserDto> {
    const credentials = this.acceptedCredentials(credentialsDto)

    await this.userProxy.registerUser(credentials.emailValue(), credentials.passwordValue())

    return this.rememberedSignIn(credentials.emailValue(), credentials.passwordValue())
  }

  /** 登入。成功就把那一對憑證記在這台瀏覽器上。 */
  async signIn(credentialsDto: CredentialsDto): Promise<SignedInUserDto> {
    const credentials = this.acceptedCredentials(credentialsDto)

    return this.rememberedSignIn(credentials.emailValue(), credentials.passwordValue())
  }

  /**
   * 從記著的那一段問出目前登入者，沒有就回 null，**能自己修好的就自己修好**。
   *
   * 修復只有兩種情況，而且都只試一次：
   *
   *   - 登入憑證自己就知道已經過期 → 先換一對。這一步連問都不必問後端就決定得了。
   *   - 拿去問卻被拒絕（例如後端重啟時換過鑰匙）→ 換一對，再問一次。
   *
   * **沒有第三次，而且那個界線寫在結構裡而不是一個計數器裡。** 續用憑證只能用一次，
   * 一直重試會踩到後端的盜用偵測，把「這台需要重登」升級成「這個人每一台都被登出」。
   * 一個可以調的重試次數，總有一天會被調成二。
   *
   * 連不上後端一律原樣拋出，而且**不丟掉記著的東西**：後端沒開不代表這一段壞了，
   * 丟掉的話使用者會在後端一啟動就被迫重登。
   */
  async restoreSession(now: Date): Promise<SignedInUserDto | null> {
    const storedSession = this.sessionStorageProxy.readSession()
    if (storedSession === null) {
      return null
    }

    const session = storedSession.toDomain()
    if (!session.refreshTokenUsable(now)) {
      // 續用憑證沒了就沒救了，而且這件事不必問後端——答案已經算得出來。
      this.sessionStorageProxy.clearSession()

      return null
    }

    const usableSession = session.accessTokenUsable(now)
      ? session
      : await this.renewedSession(session)
    if (usableSession === null) {
      return null
    }

    try {
      return await this.signedInUserFor(usableSession)
    }
    catch (error: unknown) {
      if (!(error instanceof AuthenticationRequiredError)) {
        throw error
      }
    }

    const renewedSession = await this.renewedSession(session)
    if (renewedSession === null) {
      return null
    }

    try {
      return await this.signedInUserFor(renewedSession)
    }
    catch (error: unknown) {
      if (error instanceof AuthenticationRequiredError) {
        // 換到了一份全新的憑證，後端還是不認得它——這已經不是憑證過期了。
        // 再換一次只會得到同樣的答案，外加一次踩到盜用偵測的機會。
        this.sessionStorageProxy.clearSession()

        return null
      }

      throw error
    }
  }

  /**
   * 登出：請後端撤掉這台裝置的登入階段，然後清掉本機記著的東西。
   *
   * 後端那一步**允許失敗**，而且失敗了也照樣清乾淨。登出在畫面上一定要成功——
   * 做不到的只是「立刻讓後端也忘記」，而使用者能做的只有稍後再登出一次，
   * 那不值得攔住他，更不值得讓他停在一個他已經決定要離開的畫面上。
   */
  async signOut(): Promise<void> {
    const storedSession = this.sessionStorageProxy.readSession()

    if (storedSession !== null) {
      try {
        await this.userProxy.revokeSession(storedSession.refreshToken)
      }
      catch {
        // 後端沒被告知，最多就是那一段留到它自己過期為止。
        // 這台裝置這一側，該忘的照樣忘乾淨。
      }
    }

    this.sessionStorageProxy.clearSession()
  }

  /**
   * 把關並回傳過關的那份帳密。兩個公開用例都用它，所以它值得留成一個私有方法
   * （只被一個公開方法用到的話，規範要求直接 inline 回去）。
   */
  private acceptedCredentials(credentialsDto: CredentialsDto): CredentialsDomain {
    const credentials = new CredentialsDomain(credentialsDto)
    if (!credentials.isSubmittable()) {
      throw new CredentialsFieldError(credentials.fieldErrors())
    }

    return credentials
  }

  /**
   * 登入並把那一對憑證記起來。同樣被兩個公開用例用到。
   *
   * 記不住不算失敗：畫面已經是登入狀態了，只是下次打開要重登。
   * 這個保證由儲存那一側負責——它的三個方法都不拋。
   */
  private async rememberedSignIn(email: string, password: string): Promise<SignedInUserDto> {
    const session = await this.userProxy.signIn(email, password)
    this.sessionStorageProxy.writeSession(session)

    return this.signedInUserFor(session.toDomain())
  }

  /**
   * 拿續用憑證換一對新的並記起來，換不到就回 null 並忘掉這一段。
   *
   * 「換不到」只涵蓋後端說這一段不算數。連不上後端會原樣往上拋，而且**不清除**——
   * 那兩件事對使用者的意義完全不同：一個要重新登入，一個只要把後端啟動起來。
   */
  private async renewedSession(session: SessionDomain): Promise<SessionDomain | null> {
    try {
      const renewedSession = await this.userProxy.renewSession(session.refreshToken())
      this.sessionStorageProxy.writeSession(renewedSession)

      return renewedSession.toDomain()
    }
    catch (error: unknown) {
      if (error instanceof AuthenticationRequiredError) {
        this.sessionStorageProxy.clearSession()

        return null
      }

      throw error
    }
  }

  /** 帶著這一段的登入憑證問出目前登入者。 */
  private async signedInUserFor(session: SessionDomain): Promise<SignedInUserDto> {
    const signedInUser = await this.userProxy.fetchSignedInUser(session.accessToken())

    return signedInUser.toDto()
  }
}
