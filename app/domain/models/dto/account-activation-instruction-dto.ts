/**
 * DTO：一位還沒被放行的人要做的事——寄到哪，主旨寫什麼。
 *
 * 它是 class 而不是 interface，因為它不只是一份形狀：建構它要驗，
 * 而把它變成一封信是它自己的事。interface 兩樣都帶不了。
 */
export class AccountActivationInstructionDto {
  constructor(
    public readonly requestMailbox: string,
    public readonly subject: string,
  ) {}

  /**
   * 這份指示變成一封已經填好收件人與主旨的信。
   *
   * 它掛在這裡而不是寫在畫面上，因為那串網址讀的全是這兩個欄位——
   * 寫在元件裡，元件就得為了組一串字把這份指示整個拆開。
   *
   * 主旨只做網址編碼，**一個字都不改**。它是收信的人用來認出誰在申請的唯一依據，
   * 而這裡看不出哪一段是可以動的。
   */
  toMailtoHref(): string {
    return `mailto:${encodeURIComponent(this.requestMailbox)}`
      + `?subject=${encodeURIComponent(this.subject)}`
  }
}
