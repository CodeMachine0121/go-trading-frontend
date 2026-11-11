import type { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import { SignalSourceChoicesDto } from '~/domain/models/dto/signal-source-choices-dto'
import { SignalSourceOptionDto } from '~/domain/models/dto/signal-source-option-dto'
import { SignalSourceCandidateDomain } from '~/domain/models/domains/signal-source-candidate-domain'

/**
 * Domain Model：一種行情的可用策略腳本裡，哪幾支當得了交易策略的訊號來源。
 *
 * **「當得了」的每一條規則只住在這裡**：吐訊號、而且是計算用；當不了的原因；
 * 一支都挑不到時是三種裡的哪一種。工作台只把結果攤到畫面上。
 */
export class SignalSourceChoicesDomain {
  private readonly candidates: readonly SignalSourceCandidateDomain[]

  constructor(available: AvailableStrategyScriptsDto) {
    this.candidates = [
      ...available.mine.map(strategyScript => new SignalSourceCandidateDomain(
        strategyScript.id, strategyScript.name, strategyScript.content.resultType,
        strategyScript.content.parameters.map(parameter => parameter.name), strategyScript.usage)),
      ...available.adopted.map(strategyScript => new SignalSourceCandidateDomain(
        strategyScript.id, strategyScript.name, strategyScript.resultType,
        strategyScript.parameters.map(parameter => parameter.name), strategyScript.usage)),
    ]
  }

  toDto(): SignalSourceChoicesDto {
    const usable = this.candidates.filter(candidate => candidate.feedsSignalSource)
    const unusable = this.candidates.filter(candidate => !candidate.feedsSignalSource)

    // 一支都挑不到時是哪一種：一支都沒有、有但沒有一支吐訊號、吐訊號的全是圖表用。
    const shortage = usable.length > 0
      ? null
      : unusable.length === 0
        ? 'noStrategyScripts'
        : unusable.some(candidate => candidate.emitsSignal)
          ? 'noCalculationStrategyScripts'
          : 'noSignalStrategyScripts'

    return new SignalSourceChoicesDto(
      usable.map(candidate => new SignalSourceOptionDto(candidate.id, candidate.name, candidate.parameterNames)),
      Object.fromEntries(unusable.map(candidate => [candidate.id, candidate.unusableReason])),
      shortage,
    )
  }
}
