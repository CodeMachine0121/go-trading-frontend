import { AppearanceDto } from '~/domain/models/dto/appearance-dto'
import { AppearanceOptionDto } from '~/domain/models/dto/appearance-option-dto'
import { APPEARANCE_CHOICES } from '~/domain/models/vo/appearance-choice-vo'
import type { AppearanceChoiceVo, ResolvedThemeVo } from '~/domain/models/vo/appearance-choice-vo'

const APPEARANCE_LABELS: Record<AppearanceChoiceVo, string> = {
  light: '淺色',
  system: '跟隨系統',
  dark: '深色',
}

/**
 * Domain Model：一個外觀選擇在某個系統偏好之下代表什麼。
 *
 * 記住的選擇來自這台瀏覽器，可能是空的、舊版本留下的，或被別的東西寫壞——
 * 一律在建構子裡正規化成「跟隨系統」，因為那是使用者從沒選過時的樣子。
 */
export class AppearanceDomain {
  private readonly choice: AppearanceChoiceVo

  constructor(
    rememberedChoice: string | null,
    private readonly systemPrefersDark: boolean,
  ) {
    this.choice = APPEARANCE_CHOICES.find(choice => choice === rememberedChoice) ?? 'system'
  }

  /** 要記住的那一個：正規化之後的選擇。 */
  get rememberedChoice(): AppearanceChoiceVo {
    return this.choice
  }

  toDto(): AppearanceDto {
    const systemTheme: ResolvedThemeVo = this.systemPrefersDark ? 'dark' : 'light'

    return new AppearanceDto(
      this.choice,
      this.choice === 'system' ? systemTheme : this.choice,
      APPEARANCE_CHOICES.map(choice => new AppearanceOptionDto(choice, APPEARANCE_LABELS[choice])),
    )
  }
}
