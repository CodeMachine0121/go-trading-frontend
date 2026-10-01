import type { DisplayLanguageService } from '~/domain/service/display-language-service'
import type { DisplayLanguageDto } from '~/domain/models/dto/display-language-dto'

/**
 * Application：顯示語言的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class DisplayLanguageApplication {
  constructor(private readonly displayLanguageService: DisplayLanguageService) {}

  listSelectableLanguages(): DisplayLanguageDto[] {
    return this.displayLanguageService.listSelectableLanguages()
  }

  restoreSelectedLanguage(): DisplayLanguageDto {
    return this.displayLanguageService.restoreSelectedLanguage()
  }

  selectLanguage(code: string): DisplayLanguageDto {
    return this.displayLanguageService.selectLanguage(code)
  }
}
