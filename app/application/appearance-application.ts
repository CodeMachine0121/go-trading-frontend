import type { AppearanceService } from '~/domain/service/appearance-service'
import type { AppearanceDto } from '~/domain/models/dto/appearance-dto'

export class AppearanceApplication {
  constructor(private readonly appearanceService: AppearanceService) {}

  restoreAppearance(systemPrefersDark: boolean): AppearanceDto {
    return this.appearanceService.restoreAppearance(systemPrefersDark)
  }

  selectAppearance(choice: string, systemPrefersDark: boolean): AppearanceDto {
    return this.appearanceService.selectAppearance(choice, systemPrefersDark)
  }

  resolveAppearance(choice: string, systemPrefersDark: boolean): AppearanceDto {
    return this.appearanceService.resolveAppearance(choice, systemPrefersDark)
  }
}
