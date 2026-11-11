import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyBotWatchedSymbolRemovalRefusalReasonVo } from '~/domain/models/vo/strategy-bot-watched-symbol-removal-refusal-reason-vo'

const REFUSAL_MESSAGES: Readonly<Record<StrategyBotWatchedSymbolRemovalRefusalReasonVo, LocalizedTextVo>> = {
  watchedSymbolHoldsPosition: new LocalizedTextVo(
    '監聽標的還有機器人持倉，要先讓它空手才能改交易方向或移除它；這次的修改沒有存下',
    'A watched symbol still holds a bot position; let it go flat before changing the trading direction or removing it. Nothing was saved.'),
  watchedSymbolAutoOrderOutstanding: new LocalizedTextVo(
    '監聽標的還有沒做完的自動下單，要等它做完才能改交易方向或移除它；這次的修改沒有存下',
    'A watched symbol still has an auto order in progress; wait for it to finish before changing the trading direction or removing it. Nothing was saved.'),
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
