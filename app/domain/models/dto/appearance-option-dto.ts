import type { AppearanceChoiceVo } from '~/domain/models/vo/appearance-choice-vo'

/** DTO：外觀切換上的一個選項。 */
export class AppearanceOptionDto {
  constructor(
    public readonly value: AppearanceChoiceVo,
    public readonly label: string,
  ) {}
}
