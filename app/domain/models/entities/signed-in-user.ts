import type { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

/**
 * Entity：乾淨的 Data Model，只有欄位、沒有業務邏輯。
 *
 * 密碼與由它算出來的東西在後端就沒有離開過，這一側自然也沒有欄位可以放。
 *
 * 它直接轉成 DTO，沒有中間那一層 Domain Model：這一份資料沒有任何規則
 * 要保護，而一個什麼都不做的 Domain Model 只是多一個要讀的檔案。
 * 換一種形狀不算業務邏輯，所以放在 entity 上不違反「entity 保持乾淨」。
 */
export class SignedInUser {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly isEnabled: boolean,
    public readonly activationInstruction: AccountActivationInstructionDto | null,
  ) {}

  toDto(): SignedInUserDto {
    return new SignedInUserDto(
      this.id, this.email, this.isEnabled, this.activationInstruction)
  }
}
