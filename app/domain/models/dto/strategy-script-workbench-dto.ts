/**
 * DTO：一種行情之下，策略腳本工作區長得不一樣的那幾件事。
 *
 * 工作區只讀這幾個答案，不自己比對行情種類——多一種行情時，畫面上沒有任何一個分支要改。
 */
export class StrategyScriptWorkbenchDto {
  constructor(
    /** 有沒有回測分頁。 */
    public readonly offersBacktest: boolean,
    /** 標的從合約標的清單挑，而不是現貨那一份。 */
    public readonly picksContractTradingSymbol: boolean,
  ) {}
}
