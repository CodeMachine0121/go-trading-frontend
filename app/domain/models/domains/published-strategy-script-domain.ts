import type { PublishedStrategyScript } from '~/domain/models/entities/published-strategy-script'
import { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

/**
 * Domain Model：市集上那一支策略腳本的行為。
 *
 * 它只有一件事要做：把系統交出來的那一支，轉成畫面要的形狀，並在轉的過程中回答
 * 「這一支畫得出線嗎」——那個問題的答案由指標值種類決定，而那份判斷已經有一個模型了，
 * 這裡借用它，不自己寫第二套。
 */
export class PublishedStrategyScriptDomain {
  constructor(private readonly publishedStrategyScript: PublishedStrategyScript) {}

  toDto(): PublishedStrategyScriptDto {
    const resultType = new IndicatorResultTypeDomain(this.publishedStrategyScript.resultType)
    const marketDataKind = new MarketDataKindDomain(this.publishedStrategyScript.marketDataKind)

    return new PublishedStrategyScriptDto(
      this.publishedStrategyScript.id,
      this.publishedStrategyScript.name,
      this.publishedStrategyScript.description,
      this.publishedStrategyScript.resultType,
      this.publishedStrategyScript.publisherEmail,
      this.publishedStrategyScript.publishedAt,
      this.publishedStrategyScript.parameters,
      resultType.holdsNumbers(),
      resultType.label(),
      marketDataKind.value,
      marketDataKind.label(),
    )
  }
}
