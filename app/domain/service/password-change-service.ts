import type { IUserProxy } from '~/domain/interface/i-user-proxy'
import type { PasswordChangeDto } from '~/domain/models/dto/password-change-dto'
import { PasswordChangeDomain } from '~/domain/models/domains/password-change-domain'
import { PasswordChangeFieldError } from '~/domain/errors/password-change-field-error'

/**
 * Domain Service：換掉自己的密碼這件事的唯一入口。
 *
 * 它與 UserSessionService 分開，而不是多一個公開方法掛在那裡，理由是它們**為不同的
 * 理由改變**：那一個管的是「這台瀏覽器手上這一段登入還算不算數」，而這一個管的是
 * 「換一組密碼要過哪幾關」。它也不碰記著的那一份憑證——換完之後那一份已經被後端
 * 撤掉了，而「接下來把人帶去哪」是編排，由應用層決定。
 */
export class PasswordChangeService {
  constructor(private readonly userProxy: IUserProxy) {}

  /**
   * 送出一次換密碼。
   *
   * 三格有任何一格不對就**根本不送出**，並帶著逐格的原因拋回去。其中「兩次要一樣」
   * 這一條只有這一側守得住——後端只收得到一組新密碼。
   */
  async changePassword(passwordChangeDto: PasswordChangeDto): Promise<void> {
    const passwordChange = new PasswordChangeDomain(passwordChangeDto)
    if (!passwordChange.isSubmittable()) {
      throw new PasswordChangeFieldError(passwordChange.fieldErrors())
    }

    await this.userProxy.changePassword(
      passwordChange.currentPasswordValue(), passwordChange.newPasswordValue())
  }
}
