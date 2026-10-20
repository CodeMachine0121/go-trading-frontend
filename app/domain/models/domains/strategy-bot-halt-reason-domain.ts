import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import {
  STRATEGY_BOT_HALT_REASONS,
  STRATEGY_BOT_HALT_REASON_LABELS,
} from '~/domain/models/vo/strategy-bot-halt-reason-vo'

/** An unrecognised reason reads as no halt rather than a blank cell, which would read as "fine". */
export class StrategyBotHaltReasonDomain {
  constructor(private readonly haltReason: StrategyBotHaltReasonVo | null) {}

  get isKnown(): boolean {
    return this.knownHaltReason !== null
  }

  get label(): LocalizedTextVo | null {
    const haltReason = this.knownHaltReason

    return haltReason === null ? null : STRATEGY_BOT_HALT_REASON_LABELS[haltReason]
  }

  private get knownHaltReason(): StrategyBotHaltReasonVo | null {
    return STRATEGY_BOT_HALT_REASONS.find(known => known === this.haltReason) ?? null
  }
}
