export type ContractTradeFigureTone = 'success' | 'danger' | 'neutral' | 'muted'

export class TradeFigureVo {
  constructor(
    public readonly label: string,
    public readonly text: string,
    public readonly tone: ContractTradeFigureTone,
    public readonly note: string | null = null,
  ) {}
}
