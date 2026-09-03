import type { Strategy } from '~/domain/models/entities/strategy'
import type { StrategyWriteDomain } from '~/domain/models/domains/strategy-write-domain'

/**
 * 介面以「能力」命名，不以供應商命名。同一個外部資源一個 Proxy——
 * 策略的讀、寫、刪都收在這裡，不拆成 reader / writer。
 *
 * 寫入一律收**已驗證**的 `StrategyWriteDomain`，實作端因此不必重覆驗證，
 * 也不可能有一條繞過驗證的存檔路徑。
 * 實作在 app/infrastructure/proxy/strategy-proxy.ts。
 */
export interface IStrategyProxy {
  /** 目前留著的每一支策略，依名稱排列。一支都沒有時是空陣列，不是錯誤。 */
  listStrategies(): Promise<Strategy[]>

  /** 建立一支新策略。名稱已被別的策略用掉時以 StrategyNameConflictError 拒絕。 */
  createStrategy(strategyWriteDomain: StrategyWriteDomain): Promise<Strategy>

  /**
   * 改寫指名的那一支。找不到那一支以 StrategyNotFoundError 拒絕、
   * 名稱撞到別的策略以 StrategyNameConflictError 拒絕——兩者是不同的事。
   */
  updateStrategy(strategyWriteDomain: StrategyWriteDomain): Promise<Strategy>

  /** 刪掉指名的那一支。找不到那一支以 StrategyNotFoundError 拒絕。 */
  deleteStrategy(id: number): Promise<void>
}
