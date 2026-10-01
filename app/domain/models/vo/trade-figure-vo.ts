import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export type TradeFigureTone = 'success' | 'danger' | 'neutral' | 'muted'

export class TradeFigureVo {
  constructor(
    public readonly label: LocalizedTextVo,
    public readonly text: LocalizedTextVo,
    public readonly tone: TradeFigureTone,
    public readonly note: LocalizedTextVo | null = null,
  ) {}
}
