import type { PasswordChangeDto } from '~/domain/models/dto/password-change-dto'
import { PasswordChangeFieldErrorsDto } from '~/domain/models/dto/password-change-field-errors-dto'

/**
 * 新密碼的兩道長度規則。它們與後端那兩條是同一組數字，而且**這一份不是規則的所在地**
 * ——後端才是。這裡有一份，是為了讓人不必按了鍵、等了一趟來回才知道密碼太短。
 * 兩邊說法不同時，後端說了算。與建立帳號那一份是同兩個數字，理由也同一條。
 */
const PASSWORD_MINIMUM_LENGTH = 8
const PASSWORD_MAXIMUM_BYTE_LENGTH = 72

/**
 * Domain Model：換密碼送出之前的那一關。
 *
 * 四條規則全部住在這裡：三格都要填、新密碼夠長、新密碼不太長、兩次要一樣。
 * 元件不判斷任何一條，只把算出來的**逐格說明**畫回去——三個元件各判一次，
 * 就是三個地方可以寫錯，而其中一個遲早會與後端說不同的話。
 *
 * 其中「兩次要一樣」這一條**只有這一側守得住**：後端只收得到一組新密碼，
 * 它看不出使用者第二次打錯了。既然這一格的說明本來就得由這裡產出，
 * 其餘三條一起產出才會是同一套說法、同一個掛法。
 *
 * 密碼一個字都不去空白——空白是密碼的一部分，動了它，今天設得起來的密碼
 * 明天就登不進去。這與電子郵件去空白是刻意的不一致。
 */
export class PasswordChangeDomain {
  private readonly currentPassword: string
  private readonly newPassword: string
  private readonly newPasswordConfirmation: string
  private readonly fieldErrorsDto: PasswordChangeFieldErrorsDto

  constructor(passwordChangeDto: PasswordChangeDto) {
    this.currentPassword = passwordChangeDto.currentPassword
    this.newPassword = passwordChangeDto.newPassword
    this.newPasswordConfirmation = passwordChangeDto.newPasswordConfirmation

    this.fieldErrorsDto = new PasswordChangeFieldErrorsDto(
      this.currentPasswordError(),
      this.newPasswordError(),
      this.confirmationError(),
    )
  }

  fieldErrors(): PasswordChangeFieldErrorsDto {
    return this.fieldErrorsDto
  }

  isSubmittable(): boolean {
    return this.fieldErrorsDto.currentPassword === null
      && this.fieldErrorsDto.newPassword === null
      && this.fieldErrorsDto.newPasswordConfirmation === null
  }

  currentPasswordValue(): string {
    return this.currentPassword
  }

  newPasswordValue(): string {
    return this.newPassword
  }

  /**
   * 目前那一格只檢查有沒有填。
   *
   * 它**不套用長度規則**：那些規則管的是密碼設得成什麼樣，不是它現在對不對。
   * 套用的話，一位密碼確實比較短的既有使用者會被告知自己格式填錯，
   * 而他打的其實完全正確——只有後端說得出這一格對不對。
   */
  private currentPasswordError(): string | null {
    return this.currentPassword === '' ? '請填入目前的密碼' : null
  }

  private newPasswordError(): string | null {
    if (this.newPassword === '') {
      return '請填入新的密碼'
    }

    if ([...this.newPassword].length < PASSWORD_MINIMUM_LENGTH) {
      return `密碼至少要 ${PASSWORD_MINIMUM_LENGTH} 個字元`
    }

    // 長度上限數的是位元組而不是字元，因為後端存放密碼證明的方式就數到那裡為止。
    // 中文字一個算三個，所以二十五個字就超過了。
    if (new TextEncoder().encode(this.newPassword).length > PASSWORD_MAXIMUM_BYTE_LENGTH) {
      return `密碼長度上限為 ${PASSWORD_MAXIMUM_BYTE_LENGTH} 個位元組（中文字一個算三個）`
    }

    // 換一組一模一樣的密碼是一次什麼都沒發生的操作，而使用者會以為自己換過了。
    // 這一條後端也判，但這裡判得起——兩組密碼都在手上——所以不必等一趟來回。
    if (this.newPassword === this.currentPassword) {
      return '新密碼不得與目前的密碼相同'
    }

    return null
  }

  private confirmationError(): string | null {
    if (this.newPasswordConfirmation === '') {
      return '請再打一次新的密碼'
    }

    return this.newPasswordConfirmation === this.newPassword ? null : '兩次輸入的新密碼不一致'
  }
}
