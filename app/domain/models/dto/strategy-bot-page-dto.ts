import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/**
 * DTO：一種行情的機器人畫面，與另一種不一樣的那幾件事。
 *
 * 現貨策略機器人與合約策略機器人是同一套清單與表單，只差在這幾格——
 * 所以元件只讀它，不自己比對行情種類；多一種行情時，畫面上沒有任何一個分支要改。
 */
export class StrategyBotPageDto {
  constructor(
    /** 這一頁拼的、列的都是這一種機器人。 */
    public readonly marketDataKind: MarketDataKind,
    /** 這一種機器人的清單在哪。存好或那一台不在了都回到這裡。 */
    public readonly listPath: string,
    /** 拼一台這一種機器人的去處。 */
    public readonly newPath: string,
    public readonly listTitle: string,
    public readonly listSubtitle: string,
    public readonly createTitle: string,
    public readonly editTitle: string,
    /** 清單標頭那一顆拼一台的鍵上寫什麼。 */
    public readonly createLabel: string,
    /** 一台都沒有時那一句。 */
    public readonly emptyNotice: string,
    /** 標的從合約標的清單挑（而且只列合約追蹤名單上的），而不是現貨那一份。 */
    public readonly picksContractTradingSymbol: boolean,
    /** 建議部位多一格槓桿倍數。現貨機器人沒有——現貨沒有人借錢給你。 */
    public readonly takesLeverage: boolean,
    /** 這一種機器人跟得了的交易策略叫什麼：「K 線交易策略」或「合約交易策略」。 */
    public readonly tradingStrategyLabel: string,
    /** 一份都沒有時，去拼一份要多交代的那一句；不必交代時是空字串。 */
    public readonly tradingStrategyCreateHint: string,
    /** 執行紀錄底下那一句註腳；這一種不需要時是 `null`。 */
    public readonly runHistoryNote: string | null,
  ) {}
}
