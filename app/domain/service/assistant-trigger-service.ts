import type { IAssistantTriggerPositionPreferenceProxy } from '~/domain/interface/i-assistant-trigger-position-preference-proxy'
import { AssistantTriggerPositionDomain } from '~/domain/models/domains/assistant-trigger-position-domain'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'
import type { AssistantTriggerBoundsDto } from '~/domain/models/dto/assistant-trigger-bounds-dto'

/**
 * 沒擺過的時候那顆鍵在哪：右下角，離兩邊各留一點。
 * 它是一個位置而不是「無」，因為那顆鍵永遠得在畫面上的某個地方。
 */
const DEFAULT_TRIGGER_POSITION = new AssistantTriggerPositionDto(20, 20)

/**
 * Domain Service：那顆叫出助手的鍵的位置。
 * 公開用例方法之間互不呼叫。
 */
export class AssistantTriggerService {
  constructor(
    private readonly assistantTriggerPositionPreferenceProxy: IAssistantTriggerPositionPreferenceProxy,
  ) {}

  /**
   * 讀回那顆鍵該擺的位置，**並夾回看得見的範圍**。
   *
   * 夾這一下不是多餘的：使用者可能上次在大螢幕上把它拖到很遠的地方，
   * 這次在小視窗打開——記著的位置照著擺就在視窗外面，而它是叫出助手的唯一入口。
   */
  loadTriggerPosition(bounds: AssistantTriggerBoundsDto): AssistantTriggerPositionDto {
    const remembered = this.assistantTriggerPositionPreferenceProxy.readTriggerPosition()

    return new AssistantTriggerPositionDomain(remembered ?? DEFAULT_TRIGGER_POSITION)
      .clampedInto(bounds)
  }

  /** 把這個位置夾回看得見的範圍。拖曳中的每一步與視窗大小改變時都走它。 */
  resolveTriggerPosition(
    position: AssistantTriggerPositionDto, bounds: AssistantTriggerBoundsDto,
  ): AssistantTriggerPositionDto {
    return new AssistantTriggerPositionDomain(position).clampedInto(bounds)
  }

  /**
   * 剛才那一下是在拖它，還是按了一下。
   *
   * 同一顆鍵要同時能按也能拖，就得有人回答這個問題；沒有門檻的話，
   * 按下時手抖的那一兩個像素會把每一次按都變成拖曳，那顆鍵就再也按不開了。
   */
  wasDragged(from: AssistantTriggerPositionDto, to: AssistantTriggerPositionDto): boolean {
    return new AssistantTriggerPositionDomain(to).movedFarEnoughFrom(from)
  }

  /** 記住使用者把它放下的地方。 */
  rememberTriggerPosition(position: AssistantTriggerPositionDto): void {
    this.assistantTriggerPositionPreferenceProxy.writeTriggerPosition(position)
  }
}
