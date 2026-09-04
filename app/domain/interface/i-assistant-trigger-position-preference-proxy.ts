import type { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

/**
 * 介面以「能力」命名，不以供應商命名：這個能力是「記住這台裝置把那顆鍵擺在哪」。
 * 目前由瀏覽器儲存實作；換成後端偏好設定時，介面一個字都不必改。
 * 實作在 app/infrastructure/proxy/assistant-trigger-position-preference-proxy.ts。
 */
export interface IAssistantTriggerPositionPreferenceProxy {
  /** 讀回記住的位置；沒有記住、或記著的東西讀不出來時回傳 null。 */
  readTriggerPosition(): AssistantTriggerPositionDto | null

  /** 記住這個位置，供下次打開時讀回。 */
  writeTriggerPosition(position: AssistantTriggerPositionDto): void
}
