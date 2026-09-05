import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import type { IAccessTokenStorageProxy } from '~/domain/interface/i-access-token-storage-proxy'
import type { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import type { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import { CredentialsDomain } from '~/domain/models/domains/credentials-domain'
import { CredentialsFieldError } from '~/domain/errors/credentials-field-error'
import { AuthenticationRequiredError } from '~/domain/errors/authentication-required-error'

/**
 * Domain Service：「現在是誰在用」這件事的唯一入口。
 * 四個公開用例互不呼叫。
 *
 * 建立帳號與登入合在同一個 service，因為它們同一個變更理由：
 * 什麼算是被這個操作台認得。拆開的話兩邊都要拿著同一組 proxy、
 * 同一套「拿到憑證要記起來」的規矩，改一個必然要改另一個。
 */
export class UserSessionService {
  constructor(
    private readonly userProxy: IUserProxy,
    private readonly accessTokenStorageProxy: IAccessTokenStorageProxy,
  ) {}

  /**
   * 建立帳號，成功之後**直接就是登入狀態**。
   *
   * 後端的建立只回覆一位使用者、不發憑證，所以這裡緊接著登入一次。
   * 讓使用者自己再填一次同樣的兩格是說不過去的——他兩秒前才打完。
   */
  async registerUser(credentialsDto: CredentialsDto): Promise<SignedInUserDto> {
    const credentials = this.acceptedCredentials(credentialsDto)

    await this.userProxy.registerUser(credentials.emailValue(), credentials.passwordValue())

    return this.rememberedSignIn(credentials.emailValue(), credentials.passwordValue())
  }

  /** 登入。成功就把憑證記在這台瀏覽器上。 */
  async signIn(credentialsDto: CredentialsDto): Promise<SignedInUserDto> {
    const credentials = this.acceptedCredentials(credentialsDto)

    return this.rememberedSignIn(credentials.emailValue(), credentials.passwordValue())
  }

  /**
   * 拿記住的憑證問出目前登入者，沒有就回 null。
   *
   * 自己就知道已經過期的憑證**不會被拿去問**——那是一趟答案早就算得出來的來回。
   * 後端不認得時把憑證丟掉，因為留著一份誰都不認得的憑證，
   * 只會讓下一次載入再白跑一趟。
   *
   * 連不上後端則**不丟**：後端沒開不代表這份憑證壞了，丟掉會讓人在後端一啟動就得重登。
   */
  async restoreSession(now: Date): Promise<SignedInUserDto | null> {
    const storedAccessToken = this.accessTokenStorageProxy.readAccessToken()
    if (storedAccessToken === null) {
      return null
    }

    const accessToken = storedAccessToken.toDomain()
    if (!accessToken.isUsable(now)) {
      this.accessTokenStorageProxy.clearAccessToken()
      return null
    }

    try {
      const signedInUser = await this.userProxy.fetchSignedInUser(accessToken.value())
      return signedInUser.toDomain().toDto()
    }
    catch (error: unknown) {
      if (error instanceof AuthenticationRequiredError) {
        this.accessTokenStorageProxy.clearAccessToken()
        return null
      }

      throw error
    }
  }

  /** 登出：丟掉憑證。**不問後端**——憑證本來就不在後端那裡。 */
  signOut(): void {
    this.accessTokenStorageProxy.clearAccessToken()
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
   * 登入並把憑證記起來。同樣被兩個公開用例用到。
   *
   * 記不住不算失敗：畫面已經是登入狀態了，只是下次打開要重登。
   * 這個保證由儲存那一側負責——它的三個方法都不拋。
   */
  private async rememberedSignIn(email: string, password: string): Promise<SignedInUserDto> {
    const accessToken = await this.userProxy.signIn(email, password)
    this.accessTokenStorageProxy.writeAccessToken(accessToken)

    const signedInUser = await this.userProxy.fetchSignedInUser(accessToken.toDomain().value())

    return signedInUser.toDomain().toDto()
  }
}
