/**
 * DTO：送出之前畫面自己擋下來的原因，**一格一則**。
 *
 * 它刻意不是「合不合格」一個布林：訊息要寫在出問題的那一格底下，
 * 所以它得說得出是哪一格。也刻意兩格一起回——兩格都空著的人應該一次看完，
 * 而不是改好一格再被念一次。
 *
 * `null` 代表那一格沒問題。它是純資料——「這樣還能不能送出」是判斷，
 * 住在 CredentialsDomain 身上。
 */
export class CredentialsFieldErrorsDto {
  constructor(
    public readonly email: string | null,
    public readonly password: string | null,
  ) {}
}
