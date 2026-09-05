import type { SignedInUser } from '~/domain/models/entities/signed-in-user'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

/** Domain Model：目前登入者對畫面的形狀。 */
export class SignedInUserDomain {
  private readonly id: number
  private readonly email: string

  constructor(signedInUser: SignedInUser) {
    this.id = signedInUser.id
    this.email = signedInUser.email
  }

  toDto(): SignedInUserDto {
    return new SignedInUserDto(this.id, this.email)
  }
}
