import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class StrategyBotWatchedSymbolDto {
  constructor(
    public readonly symbol: string,
    public readonly symbolLabel: LocalizedTextVo,
    public readonly stateLabel: LocalizedTextVo,
    public readonly stateTone: 'danger' | 'warning' | 'neutral',
    public readonly lastSentSignalLabel: LocalizedTextVo,
    public readonly isConflicting: boolean,
    public readonly isHalted: boolean,
    public readonly haltReasonLabel: LocalizedTextVo | null,
    public readonly autoOrderPositionLabel: LocalizedTextVo | null,
  ) {}
}
