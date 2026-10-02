import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

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

  get quantityLabel(): LocalizedTextVo {
    return this.baseAsset === null
      ? new LocalizedTextVo('數量', 'Quantity')
      : new LocalizedTextVo(`數量（${this.baseAsset}）`, `Quantity (${this.baseAsset})`)
  }
}
