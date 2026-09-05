import type { UserSessionService } from '~/domain/service/user-session-service'
import type { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import type { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

/**
 * Application：編排用例，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive、不 import 任何 .vue。
 */
export class UserSessionApplication {
  constructor(private readonly userSessionService: UserSessionService) {}

  async registerUser(credentialsDto: CredentialsDto): Promise<SignedInUserDto> {
    return this.userSessionService.registerUser(credentialsDto)
  }

  async signIn(credentialsDto: CredentialsDto): Promise<SignedInUserDto> {
    return this.userSessionService.signIn(credentialsDto)
  }

  async restoreSession(now: Date): Promise<SignedInUserDto | null> {
    return this.userSessionService.restoreSession(now)
  }

  signOut(): void {
    this.userSessionService.signOut()
  }
}
