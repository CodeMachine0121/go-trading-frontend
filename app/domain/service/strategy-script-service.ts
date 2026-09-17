import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import { StrategyScriptDraftDomain } from '~/domain/models/domains/strategy-script-draft-domain'
import { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'
import { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import type { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
/**
 * Domain Service：策略腳本的編排。
 * 公開用例方法之間互不呼叫。
 */
export class StrategyScriptService {
  constructor(private readonly strategyScriptProxy: IStrategyScriptProxy) {}

  /**
   * 日常挑策略腳本時看得到的那一份：自己的，加上從市集加入的。兩段都空是答案，不是錯誤。
   *
   * 回的是兩段而不是一段混起來的清單，因為加入來的那些**沒有算式**——
   * 混成一段就需要一個「有時候有算式」的型別，而那正是這個功能要消滅的東西。
   */
  async listAvailableStrategyScripts(): Promise<AvailableStrategyScriptsDto> {
    const available = await this.strategyScriptProxy.listAvailableStrategyScripts()

    return new AvailableStrategyScriptsDto(
      available.mine.map(strategyScript => strategyScript.toDomain().toDto()),
      available.adopted.map(published => published.toDomain().toDto()),
    )
  }

  /**
   * 存一支策略腳本。**帶識別碼就是改寫那一支，不帶就是新增一支**——
   * 呼叫端因此不必先判斷自己算哪一種，也不會有兩條各自演化的存檔路徑。
   * 內容不合規則時在這裡就被擋下，一個字都不會送出去。
   */
  async saveStrategyScript(strategyScriptWriteDto: StrategyScriptWriteDto): Promise<StrategyScriptDto> {
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(strategyScriptWriteDto)

    const saved = strategyScriptWriteDomain.id === undefined
      ? await this.strategyScriptProxy.createStrategyScript(strategyScriptWriteDomain)
      : await this.strategyScriptProxy.updateStrategyScript(strategyScriptWriteDomain)

    return saved.toDomain().toDto()
  }

  async deleteStrategyScript(id: number): Promise<void> {
    return this.strategyScriptProxy.deleteStrategyScript(id)
  }

  /** 把自己的那一支放上市集。已經在上面的再放一次不算失敗。 */
  async publishStrategyScript(id: number): Promise<void> {
    return this.strategyScriptProxy.publishStrategyScript(id)
  }

  /**
   * 把自己的那一支從市集收回。所有加入過它的人也隨之失去它——
   * 這件事的份量在畫面上以一次確認呈現，而不是靠這裡多說什麼。
   */
  async withdrawStrategyScript(id: number): Promise<void> {
    return this.strategyScriptProxy.withdrawStrategyScript(id)
  }

  /**
   * 畫面上這一份東西，跟載入當下那一份比，改過了沒有。
   * 畫面問這一個問題，而不是自己比四個欄位——漏比一個就會靜靜蓋掉使用者寫的東西。
   */
  hasUnsavedChanges(
    loadedContent: StrategyScriptContentDto | null,
    currentContent: StrategyScriptContentDto,
  ): boolean {
    return new StrategyScriptDraftDomain(loadedContent, currentContent).hasUnsavedChanges()
  }
}
