import type { AssistantTriggerService } from '~/domain/service/assistant-trigger-service'
import type { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'
import type { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

/** Application：那顆叫出助手的鍵的用例編排，全程只碰 DTO。 */
export class AssistantTriggerApplication {
  constructor(private readonly assistantTriggerService: AssistantTriggerService) {}

  loadTriggerPosition(bounds: AssistantTriggerBoundsDto): AssistantTriggerPositionDto {
    return this.assistantTriggerService.loadTriggerPosition(bounds)
  }

  resolveTriggerPosition(
    position: AssistantTriggerPositionDto, bounds: AssistantTriggerBoundsDto,
  ): AssistantTriggerPositionDto {
    return this.assistantTriggerService.resolveTriggerPosition(position, bounds)
  }

  wasDragged(from: AssistantTriggerPositionDto, to: AssistantTriggerPositionDto): boolean {
    return this.assistantTriggerService.wasDragged(from, to)
  }

  rememberTriggerPosition(position: AssistantTriggerPositionDto): void {
    this.assistantTriggerService.rememberTriggerPosition(position)
  }
}
