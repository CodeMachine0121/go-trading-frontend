import type { CredentialsDto } from '~/domain/models/dto/credentials-dto'
import { CredentialsFieldErrorsDto } from '~/domain/models/dto/credentials-field-errors-dto'

/**
 * 建立帳號時密碼的兩道長度規則。它們與後端的那兩條是同一組數字，
 * 而且**這一份不是規則的所在地**——後端才是。這裡有一份，只是為了讓人不必
 * 按了鍵、等了一趟來回，才知道自己的密碼太短。兩邊說法不同時，後端說了算。
 */
const PASSWORD_MINIMUM_LENGTH = 8
const PASSWORD_MAXIMUM_BYTE_LENGTH = 72

/**
 * Domain Model：送出之前的那一關。
 *
 * 它回的是**每一格各自的錯誤**，不是「合不合格」一個布林——訊息要寫在出問題的那一格
 * 底下，所以它得說得出是哪一格。
 *
 * 長度規則**只在建立帳號時套用**，而這正是模式必須是這個模型一部分的原因。
 * 登入時套用它，會對一個密碼確實比較短的既有帳號說「你格式填錯了」；
 * 而且最短長度一改，昨天設得起來的密碼今天就登不進去。
 *
 * 它刻意**不判斷電子郵件的格式**，只要求不空白。判斷格式等於把後端那套規則抄一份過來，
 * 兩份一定會漂移；而格式錯的代價只是多一趟來回。
 */
export class CredentialsDomain {
  private readonly email: string
  private readonly password: string
  private readonly fieldErrorsDto: CredentialsFieldErrorsDto

  constructor(credentialsDto: CredentialsDto) {
    // 電子郵件去前後空白，密碼一個字都不動——空白是密碼的一部分，
    // 動了它，今天設得起來的密碼明天就登不進去。
    this.email = credentialsDto.email.trim()
    this.password = credentialsDto.password

    this.fieldErrorsDto = new CredentialsFieldErrorsDto(
      this.emailError(),
      this.passwordError(credentialsDto.mode === 'register'),
    )
  }

  fieldErrors(): CredentialsFieldErrorsDto {
    return this.fieldErrorsDto
  }

  isSubmittable(): boolean {
    return this.fieldErrorsDto.email === null && this.fieldErrorsDto.password === null
  }

  /** 這兩格送出去時的樣子：電子郵件已經去掉前後空白，密碼一如打進去的模樣。 */
  emailValue(): string {
    return this.email
  }

  passwordValue(): string {
    return this.password
  }

  private emailError(): string | null {
    return this.email === '' ? '請填入電子郵件' : null
  }

  private passwordError(lengthRulesApply: boolean): string | null {
    if (this.password === '') {
      return '請填入密碼'
    }

    if (!lengthRulesApply) {
      return null
    }

    if ([...this.password].length < PASSWORD_MINIMUM_LENGTH) {
      return `密碼至少要 ${PASSWORD_MINIMUM_LENGTH} 個字元`
    }

    // 長度上限數的是位元組而不是字元，因為後端存放密碼證明的方式就數到那裡為止。
    // 中文字一個算三個，所以二十五個字就超過了。
    if (new TextEncoder().encode(this.password).length > PASSWORD_MAXIMUM_BYTE_LENGTH) {
      return `密碼長度上限為 ${PASSWORD_MAXIMUM_BYTE_LENGTH} 個位元組（中文字一個算三個）`
    }

    return null
  }
}
