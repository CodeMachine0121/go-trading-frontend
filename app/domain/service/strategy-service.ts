import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { StrategyDraftDomain } from '~/domain/models/domains/strategy-draft-domain'
import { StrategyWriteDomain } from '~/domain/models/domains/strategy-write-domain'
import { AvailableStrategiesDto } from '~/domain/models/dto/available-strategies-dto'
import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
/**
 * Domain Service：策略的編排。
 * 公開用例方法之間互不呼叫。
 */
export class StrategyService {
  constructor(private readonly strategyProxy: IStrategyProxy) {}

  /**
   * 日常挑策略時看得到的那一份：自己的，加上從市集加入的。兩段都空是答案，不是錯誤。
   *
   * 回的是兩段而不是一段混起來的清單，因為加入來的那些**沒有算式**——
   * 混成一段就需要一個「有時候有算式」的型別，而那正是這個功能要消滅的東西。
   */
  async listAvailableStrategies(): Promise<AvailableStrategiesDto> {
    const available = await this.strategyProxy.listAvailableStrategies()

    return new AvailableStrategiesDto(
      available.mine.map(strategy => strategy.toDomain().toDto()),
      available.adopted.map(published => published.toDomain().toDto()),
    )
  }

  /**
   * 存一支策略。**帶識別碼就是改寫那一支，不帶就是新增一支**——
   * 呼叫端因此不必先判斷自己算哪一種，也不會有兩條各自演化的存檔路徑。
   * 內容不合規則時在這裡就被擋下，一個字都不會送出去。
   */
  async saveStrategy(strategyWriteDto: StrategyWriteDto): Promise<StrategyDto> {
    const strategyWriteDomain = new StrategyWriteDomain(strategyWriteDto)

    const saved = strategyWriteDomain.id === undefined
      ? await this.strategyProxy.createStrategy(strategyWriteDomain)
      : await this.strategyProxy.updateStrategy(strategyWriteDomain)

    return saved.toDomain().toDto()
  }

  async deleteStrategy(id: number): Promise<void> {
    return this.strategyProxy.deleteStrategy(id)
  }

  /** 把自己的那一支放上市集。已經在上面的再放一次不算失敗。 */
  async publishStrategy(id: number): Promise<void> {
    return this.strategyProxy.publishStrategy(id)
  }

  /**
   * 把自己的那一支從市集收回。所有加入過它的人也隨之失去它——
   * 這件事的份量在畫面上以一次確認呈現，而不是靠這裡多說什麼。
   */
  async withdrawStrategy(id: number): Promise<void> {
    return this.strategyProxy.withdrawStrategy(id)
  }

  /**
   * 畫面上這一份東西，跟載入當下那一份比，改過了沒有。
   * 畫面問這一個問題，而不是自己比四個欄位——漏比一個就會靜靜蓋掉使用者寫的東西。
   */
  hasUnsavedChanges(
    loadedContent: StrategyContentDto | null,
    currentContent: StrategyContentDto,
  ): boolean {
    return new StrategyDraftDomain(loadedContent, currentContent).hasUnsavedChanges()
  }
}
