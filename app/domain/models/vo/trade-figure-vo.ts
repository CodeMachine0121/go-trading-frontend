export type TradeFigureTone = 'success' | 'danger' | 'neutral' | 'muted'

export class TradeFigureVo {
  constructor(
    public readonly label: string,
    public readonly text: string,
    public readonly tone: TradeFigureTone,
    public readonly note: string | null = null,
  ) {}
}
