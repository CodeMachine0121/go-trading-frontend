import type { SignInMode } from '~/domain/models/vo/sign-in-mode'

/**
 * DTO：元件交給 application 的那兩格內容，以及現在是哪一件事。
 *
 * 模式跟著兩格一起走，因為**送出前的規則會因為它而不同**：建立帳號要求密碼的長度，
 * 登入不要求。少了它，呼叫端就得自己記得「這一次要不要跳過長度那幾條」，
 * 而那正是遲早會有人忘記的那種事。
 *
 * 密碼在這裡是它被打出來的樣子，且只走到送出的那一次請求為止——
 * 沒有任何地方會把它記下來。
 */
export class CredentialsDto {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly mode: SignInMode,
  ) {}
}
