import type { PublishedStrategy } from '~/domain/models/entities/published-strategy'
import { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'

/**
 * Domain Model：市集上那一支策略的行為。
 *
 * 它只有一件事要做：把系統交出來的那一支，轉成畫面要的形狀，並在轉的過程中回答
 * 「這一支畫得出線嗎」——那個問題的答案由指標值種類決定，而那份判斷已經有一個模型了，
 * 這裡借用它，不自己寫第二套。
 */
export class PublishedStrategyDomain {
  constructor(private readonly publishedStrategy: PublishedStrategy) {}

  toDto(): PublishedStrategyDto {
    const resultType = new IndicatorResultTypeDomain(this.publishedStrategy.resultType)

    return new PublishedStrategyDto(
      this.publishedStrategy.id,
      this.publishedStrategy.name,
      this.publishedStrategy.description,
      this.publishedStrategy.resultType,
      this.publishedStrategy.publisherEmail,
      this.publishedStrategy.publishedAt,
      this.publishedStrategy.parameters,
      resultType.holdsNumbers(),
      resultType.label(),
    )
  }
}
