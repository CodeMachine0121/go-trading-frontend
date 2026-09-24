import type { IAppearancePreferenceProxy } from '~/domain/interface/i-appearance-preference-proxy'
import { AppearanceDomain } from '~/domain/models/domains/appearance-domain'
import type { AppearanceDto } from '~/domain/models/dto/appearance-dto'

/**
 * Domain Service：外觀的三個用例。公開用例方法之間互不呼叫。
 */
export class AppearanceService {
  constructor(private readonly appearancePreferenceProxy: IAppearancePreferenceProxy) {}

  /** 讀回這台裝置記住的外觀；沒記住或看不懂時跟隨系統。 */
  restoreAppearance(systemPrefersDark: boolean): AppearanceDto {
    return new AppearanceDomain(
      this.appearancePreferenceProxy.readAppearanceChoice(), systemPrefersDark).toDto()
  }

  /** 選定一種外觀並記住它；記住的是正規化之後的那一個。 */
  selectAppearance(choice: string, systemPrefersDark: boolean): AppearanceDto {
    const appearance = new AppearanceDomain(choice, systemPrefersDark)
    this.appearancePreferenceProxy.writeAppearanceChoice(appearance.rememberedChoice)

    return appearance.toDto()
  }

  /** 系統的深淺換了：同一個選擇在新的系統偏好下是什麼樣子。不寫入任何東西。 */
  resolveAppearance(choice: string, systemPrefersDark: boolean): AppearanceDto {
    return new AppearanceDomain(choice, systemPrefersDark).toDto()
  }
}
