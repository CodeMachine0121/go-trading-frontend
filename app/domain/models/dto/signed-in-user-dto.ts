import type { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'

/**
 * DTO：目前登入者交給元件的唯一形狀。
 *
 * 這一側從來沒有拿到過密碼或由它算出來的東西，所以也沒有地方可以不小心把它傳下去。
 */
export class SignedInUserDto {
  constructor(
    public readonly id: number,
    public readonly email: string,
    /** 這個帳號被人放行了沒。沒有的話，他進得了門卻什麼都做不了。 */
    public readonly isEnabled: boolean,
    /**
     * 還在等的時候該怎麼辦。**放行之後是 `null`**，不是一份空的指示——
     * 一份已經不適用的指示比沒有更糟：會有人照著做。
     */
    public readonly activationInstruction: AccountActivationInstructionDto | null,
  ) {}
}
