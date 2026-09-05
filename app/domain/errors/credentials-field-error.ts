import type { CredentialsFieldErrorsDto } from '~/domain/models/dto/credentials-field-errors-dto'

/**
 * 哨兵錯誤：送出之前畫面自己擋下來了，因為某一格填得不對。
 *
 * 它帶著**每一格各自的原因**而不是一句話，因為那些話要寫在出問題的那一格底下。
 * 它與後端的拒絕分開，是因為它連送都沒送出去——沒有來回，也沒有後端說過任何話。
 */
export class CredentialsFieldError extends Error {
  readonly fieldErrors: CredentialsFieldErrorsDto

  // 它沒有 cause，因為它沒有起因：這一次根本沒有送出去，沒有任何下層的失敗可以包。
  constructor(fieldErrors: CredentialsFieldErrorsDto) {
    super('登入內容有欄位需要修正')
    this.name = 'CredentialsFieldError'
    this.fieldErrors = fieldErrors
  }
}
