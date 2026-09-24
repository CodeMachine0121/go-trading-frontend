import type { AppearanceOptionDto } from '~/domain/models/dto/appearance-option-dto'
import type { AppearanceChoiceVo, ResolvedThemeVo } from '~/domain/models/vo/appearance-choice-vo'

/**
 * DTO：現在的外觀。
 *
 * 畫面拿到的是**選擇**與**實際套上的主題**兩件事：切換鍵亮哪一顆看前者，
 * 畫面上的顏色看後者。跟隨系統時兩者不同，所以不能只給一個。
 */
export class AppearanceDto {
  constructor(
    public readonly choice: AppearanceChoiceVo,
    public readonly resolvedTheme: ResolvedThemeVo,
    public readonly options: readonly AppearanceOptionDto[],
  ) {}
}
