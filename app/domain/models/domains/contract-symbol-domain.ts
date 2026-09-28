const QUOTE_ASSETS = ['FDUSD', 'USDT', 'USDC', 'BUSD']

export class ContractSymbolDomain {
  private readonly symbol: string

  constructor(symbol: string) {
    this.symbol = symbol.trim().toUpperCase()
  }

  get quoteAsset(): string | null {
    return QUOTE_ASSETS.find(quoteAsset => this.symbol.length > quoteAsset.length && this.symbol.endsWith(quoteAsset)) ?? null
  }

  get baseAsset(): string | null {
    const quoteAsset = this.quoteAsset

    return quoteAsset === null ? null : this.symbol.slice(0, -quoteAsset.length)
  }

  get quantityLabel(): string {
    return this.baseAsset === null ? '數量' : `數量（${this.baseAsset}）`
  }
}
