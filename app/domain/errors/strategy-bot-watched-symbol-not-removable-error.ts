import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyBotWatchedSymbolRemovalRefusalReasonVo } from '~/domain/models/vo/strategy-bot-watched-symbol-removal-refusal-reason-vo'

const REFUSAL_MESSAGES: Readonly<Record<StrategyBotWatchedSymbolRemovalRefusalReasonVo, LocalizedTextVo>> = {
  watchedSymbolHoldsPosition: new LocalizedTextVo(
    '要移除的交易標的還有機器人持倉，要先讓它空手才能移除；監聽標的沒有改變',
    'A symbol you removed still holds a bot position; let it go flat before removing it. The watched symbols were left unchanged.'),
  watchedSymbolAutoOrderOutstanding: new LocalizedTextVo(
    '要移除的交易標的還有沒做完的自動下單，要等它做完才能移除；監聽標的沒有改變',
    'A symbol you removed still has an auto order in progress; wait for it to finish before removing it. The watched symbols were left unchanged.'),
}

export class StrategyBotWatchedSymbolNotRemovableError extends LocalizedError {
  constructor(
    public readonly reason: StrategyBotWatchedSymbolRemovalRefusalReasonVo,
    options?: { cause?: unknown },
  ) {
    super(REFUSAL_MESSAGES[reason], options)
    this.name = 'StrategyBotWatchedSymbolNotRemovableError'
  }
}
