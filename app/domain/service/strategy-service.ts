import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { StrategyDraftDomain } from '~/domain/models/domains/strategy-draft-domain'
import { StrategyWriteDomain } from '~/domain/models/domains/strategy-write-domain'
import { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import { AGGREGATION_INTERVALS, FINEST_AGGREGATION_INTERVAL } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * Domain Service：策略的編排。
 * 公開用例方法之間互不呼叫。
 */
export class StrategyService {
  constructor(private readonly strategyProxy: IStrategyProxy) {}

  /** 目前留著的每一支策略。一支都沒有是空清單，不是錯誤。 */
  async listStrategies(): Promise<StrategyDto[]> {
    const strategies = await this.strategyProxy.listStrategies()

    return strategies.map(strategy => strategy.toDomain().toDto())
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

  /** 使用者可以挑的彙總刻度，含給人看的名字。清單沿用既有的那一份，不另列。 */
  listAggregationIntervalOptions(): AggregationIntervalOptionDto[] {
    return AGGREGATION_INTERVALS.map(
      interval => new AggregationIntervalOptionDto(interval.value, interval.label))
  }

  /** 沒特別挑時是哪一種。畫面不自己指定預設值。 */
  defaultAggregationInterval(): AggregationIntervalValue {
    return FINEST_AGGREGATION_INTERVAL.value
  }
}
