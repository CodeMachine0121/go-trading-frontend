/**
 * DTO：目前登入者交給元件的唯一形狀。
 *
 * 只有兩個欄位，而缺席的第三個才是重點：這一側從來沒有拿到過密碼或由它算出來的東西，
 * 所以也沒有地方可以不小心把它傳下去。
 */
export class SignedInUserDto {
  constructor(
    public readonly id: number,
    public readonly email: string,
  ) {}
}
