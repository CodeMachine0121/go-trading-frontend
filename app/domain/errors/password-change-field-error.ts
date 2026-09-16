import type { PasswordChangeFieldErrorsDto } from '~/domain/models/dto/password-change-field-errors-dto'

/**
 * 哨兵錯誤：送出之前畫面自己擋下來了，因為某一格填得不對。
 *
 * 它帶著**每一格各自的原因**而不是一句話，因為那些話要寫在出問題的那一格底下。
 * 比照登入那一份。它沒有 cause——這一次根本沒有送出去，沒有任何下層的失敗可以包。
 */
export class PasswordChangeFieldError extends Error {
  readonly fieldErrors: PasswordChangeFieldErrorsDto

  constructor(fieldErrors: PasswordChangeFieldErrorsDto) {
    super('換密碼的內容有欄位需要修正')
    this.name = 'PasswordChangeFieldError'
    this.fieldErrors = fieldErrors
  }
}
