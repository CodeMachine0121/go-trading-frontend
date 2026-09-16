/**
 * DTO：換密碼那三格的內容。
 *
 * 第三格只存在於畫面這一側。後端只收得到一組新密碼，看不出使用者第二次打錯了——
 * 所以「兩次要一樣」這條規則沒有別人守得住，也因此那一格必須跟著另外兩格一起走，
 * 不能由元件自己比對完再丟掉。
 *
 * 三組密碼都是它們被打出來的樣子，且只走到送出的那一次請求為止——
 * 沒有任何地方會把它們記下來。
 */
export class PasswordChangeDto {
  constructor(
    public readonly currentPassword: string,
    public readonly newPassword: string,
    public readonly newPasswordConfirmation: string,
  ) {}
}
