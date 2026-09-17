import type { PublishedStrategyScript } from '~/domain/models/entities/published-strategy-script'
import type { StrategyScript } from '~/domain/models/entities/strategy-script'
import type { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'

/**
 * 介面以「能力」命名，不以供應商命名。同一個外部資源一個 Proxy——
 * 策略腳本的讀、寫、刪都收在這裡，不拆成 reader / writer。
 *
 * 寫入一律收**已驗證**的 `StrategyScriptWriteDomain`，實作端因此不必重覆驗證，
 * 也不可能有一條繞過驗證的存檔路徑。
 * 實作在 app/infrastructure/proxy/strategy-script-proxy.ts。
 */
export interface IStrategyScriptProxy {
  /**
   * 日常挑策略腳本時看得到的那一份：**自己的**與**從市集加入的**，各自依名稱排列。
   * 兩段都空是空的兩段，不是錯誤。
   *
   * 回的是一對而不是一個陣列，因為那兩段的形狀本來就不同——加入來的那些沒有算式。
   */
  listAvailableStrategyScripts(): Promise<{
    mine: StrategyScript[]
    adopted: PublishedStrategyScript[]
  }>

  /** 建立一支新策略腳本。名稱已被別的策略腳本用掉時以 StrategyScriptNameConflictError 拒絕。 */
  createStrategyScript(strategyScriptWriteDomain: StrategyScriptWriteDomain): Promise<StrategyScript>

  /**
   * 改寫指名的那一支。找不到那一支以 StrategyScriptNotFoundError 拒絕、
   * 名稱撞到別的策略腳本以 StrategyScriptNameConflictError 拒絕——兩者是不同的事。
   */
  updateStrategyScript(strategyScriptWriteDomain: StrategyScriptWriteDomain): Promise<StrategyScript>

  /** 刪掉指名的那一支。找不到那一支以 StrategyScriptNotFoundError 拒絕。 */
  deleteStrategyScript(id: number): Promise<void>

  /**
   * 把自己的那一支放上市集。**只有擁有者做得到**——別人的那一支以
   * StrategyScriptNotFoundError 拒絕，那與「沒有這一支」是同一句話。
   * 已經在上面的再放一次不算失敗。
   */
  publishStrategyScript(id: number): Promise<void>

  /**
   * 把自己的那一支從市集收回，所有加入過它的人也隨之失去它。
   * 本來就不在上面的再收一次不算失敗。
   */
  withdrawStrategyScript(id: number): Promise<void>
}
