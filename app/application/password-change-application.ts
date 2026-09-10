import type { PasswordChangeService } from '~/domain/service/password-change-service'
import { PasswordChangeDto } from '~/domain/models/dto/password-change-dto'

/** Application：換掉自己的密碼這個用例的編排。 */
export class PasswordChangeApplication {
  constructor(private readonly passwordChangeService: PasswordChangeService) {}

  async changePassword(
    currentPassword: string, newPassword: string, newPasswordConfirmation: string,
  ): Promise<void> {
    await this.passwordChangeService.changePassword(
      new PasswordChangeDto(currentPassword, newPassword, newPasswordConfirmation))
  }
}
