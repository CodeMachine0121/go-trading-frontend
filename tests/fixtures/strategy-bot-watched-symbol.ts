import { StrategyBotWatchedSymbolDto } from '~/domain/models/dto/strategy-bot-watched-symbol-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export function aWatchedSymbolDto(overrides: Partial<{
  symbol: string
  stateLabel: LocalizedTextVo
  stateTone: 'danger' | 'warning' | 'neutral'
  isConflicting: boolean
  isHalted: boolean
  haltReasonLabel: LocalizedTextVo | null
  autoOrderPositionLabel: LocalizedTextVo | null
}> = {}): StrategyBotWatchedSymbolDto {
  const symbol = overrides.symbol ?? 'BTCUSDT'

  return new StrategyBotWatchedSymbolDto(
    symbol,
    new UntranslatedTextVo(symbol),
    overrides.stateLabel ?? new LocalizedTextVo('還沒送出過', 'None sent yet'),
    overrides.stateTone ?? 'neutral',
    new LocalizedTextVo('還沒送出過', 'None sent yet'),
    overrides.isConflicting ?? false,
    overrides.isHalted ?? false,
    overrides.haltReasonLabel ?? null,
    overrides.autoOrderPositionLabel ?? null,
  )
}
