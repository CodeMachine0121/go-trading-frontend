import { SignedInUserDomain } from '~/domain/models/domains/signed-in-user-domain'

/**
 * Entity：乾淨的 Data Model，只有欄位、沒有業務邏輯。
 *
 * 它只有識別碼與電子郵件，因為後端也只給這兩樣——密碼與由它算出來的東西
 * 在後端就沒有離開過，這一側自然也沒有欄位可以放。
 */
export class SignedInUser {
  constructor(
    public readonly id: number,
    public readonly email: string,
  ) {}

  toDomain(): SignedInUserDomain {
    return new SignedInUserDomain(this)
  }
}
