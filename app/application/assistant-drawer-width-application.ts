import type { AssistantDrawerWidthService } from '~/domain/service/assistant-drawer-width-service'

/** Application：助手抽屜寬度的用例編排。 */
export class AssistantDrawerWidthApplication {
  constructor(private readonly assistantDrawerWidthService: AssistantDrawerWidthService) {}

  loadDrawerWidth(viewportWidth: number): number {
    return this.assistantDrawerWidthService.loadDrawerWidth(viewportWidth)
  }

  resolveDrawerWidth(width: number, viewportWidth: number): number {
    return this.assistantDrawerWidthService.resolveDrawerWidth(width, viewportWidth)
  }

  rememberDrawerWidth(width: number): void {
    this.assistantDrawerWidthService.rememberDrawerWidth(width)
  }
}
