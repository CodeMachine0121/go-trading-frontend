import type { DisplayLanguageCodeVo } from '~/domain/models/vo/display-language-code-vo'

/** DTO：一個可選的顯示語言交給 application 與畫面的形狀。 */
export class DisplayLanguageDto {
  constructor(
    public readonly code: DisplayLanguageCodeVo,
    public readonly nativeName: string,
  ) {}
}
