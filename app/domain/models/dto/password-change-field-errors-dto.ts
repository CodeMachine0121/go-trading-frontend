/**
 * DTO：換密碼被擋下來的原因，**一格一則**。
 *
 * 它刻意不是一句話：三格的訊息要各自寫在那一格底下，否則使用者得自己猜是哪一格。
 * 比照登入那一份的做法。
 *
 * `null` 代表那一格沒問題。它是純資料——「這樣還能不能送出」是判斷，
 * 住在 PasswordChangeDomain 身上。
 */
export class PasswordChangeFieldErrorsDto {
  constructor(
    public readonly currentPassword: string | null,
    public readonly newPassword: string | null,
    public readonly newPasswordConfirmation: string | null,
  ) {}
}
