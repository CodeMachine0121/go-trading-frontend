import type { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'
import type { TelegramDeliveryWriteDto } from '~/domain/models/dto/telegram-delivery-write-dto'

/**
 * 介面以「能力」命名：這個能力是「向後端讀寫『這台系統要怎麼找到我』，並試送一則訊息」。
 * 實作在 app/infrastructure/proxy/telegram-delivery-proxy.ts。
 *
 * 四件事收在同一個 proxy，因為它們是同一個後端資源的四條路——
 * 一個外部資源一個 Proxy，不拆 reader / writer。
 */
export interface ITelegramDeliveryProxy {
  /**
   * 讀回這個人的設定。**還沒設定過不是錯誤**，回一個說自己還沒設定的 entity。
   *
   * 回傳的形狀裡沒有完整金鑰，也沒有任何裝得下它的位置。
   */
  fetchDeliverySetting(): Promise<TelegramDelivery>

  /**
   * 存下這個人的設定，有就整份覆蓋。
   *
   * 後端沒有東西可以把金鑰鎖起來時拋 SecretSealUnavailableError——那不是使用者
   * 填錯了什麼，而它**絕不會改用不上鎖的方式存**。
   */
  saveDeliverySetting(writeDto: TelegramDeliveryWriteDto): Promise<TelegramDelivery>

  /** 整份移除。**沒有設定也不算失敗**——要的狀態已經達成了。 */
  removeDeliverySetting(): Promise<void>

  /**
   * 用已經存起來的那一份送一則訊息，並回報送不出去時是哪一種原因。
   *
   * **送不出去不是這一次呼叫的失敗**：問的就是「這條路通不通」，而它問到了答案。
   * 回傳的是四種原因之一，或 null 代表送到了。還沒設定過才是失敗，
   * 拋 TelegramNotConfiguredError。
   */
  sendTestMessage(message: string): Promise<string | null>
}
