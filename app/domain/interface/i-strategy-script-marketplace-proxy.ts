import type { PublishedStrategyScript } from '~/domain/models/entities/published-strategy-script'

/**
 * 介面以「能力」命名：這個能力是「共用的那個貨架」——上面有什麼，以及某個人收下了哪幾支。
 *
 * 它與策略腳本那一個 proxy 分開，因為兩者回答的是不同的問題：那一個回答「我的東西」，
 * 這一個回答「外面有什麼」。市集日後長出搜尋、分類或使用次數時，長的是這一個，
 * 而日常挑策略腳本那條路一行都不會動。
 *
 * 實作在 app/infrastructure/proxy/strategy-script-marketplace-proxy.ts。
 */
export interface IStrategyScriptMarketplaceProxy {
  /**
   * 市集上目前有什麼，**最近分享的排前面**。
   * 一支都沒有時是空陣列，不是錯誤。回來的每一支都**沒有算式**。
   */
  browseMarketplace(): Promise<PublishedStrategyScript[]>

  /**
   * 把市集上的那一支放進自己的清單。已經加入過的再加一次不算失敗。
   * 市集上沒有那一支時以 StrategyScriptNotFoundError 拒絕。
   */
  adoptStrategyScript(id: number): Promise<void>

  /** 從自己的清單拿掉。本來就沒有加入過的再拿一次不算失敗；它仍然在市集上。 */
  abandonStrategyScript(id: number): Promise<void>
}
