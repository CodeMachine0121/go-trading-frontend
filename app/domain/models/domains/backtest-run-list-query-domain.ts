import type { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'

/** 沒說最多幾筆時後端給二十筆；再往下翻一次多拿這麼多；後端一次最多給兩百筆。 */
export const BACKTEST_RUN_PAGE_SIZE = 20
export const BACKTEST_RUN_LIMIT_CEILING = 200

/** Domain Model：一次列出輪次的條件——最多幾筆照規則收在範圍內，翻頁就是把上限往上加。 */
export class BacktestRunListQueryDomain {
  readonly limit: number

  constructor(private readonly query: BacktestRunListQueryDto) {
    const declared = query.limit ?? BACKTEST_RUN_PAGE_SIZE

    this.limit = Math.min(Math.max(Math.trunc(declared), 1), BACKTEST_RUN_LIMIT_CEILING)
  }

  get status() {
    return this.query.status
  }

  get strategyScriptId() {
    return this.query.strategyScriptId
  }

  get tradingStrategyId() {
    return this.query.tradingStrategyId
  }

  /** 還翻得下去嗎：清單比全部少，而且上限還沒頂到天花板。 */
  canShowMore(shownCount: number, totalCount: number): boolean {
    return shownCount < totalCount && this.limit < BACKTEST_RUN_LIMIT_CEILING
  }

  grown(): BacktestRunListQueryDto {
    return this.query.withLimit(Math.min(this.limit + BACKTEST_RUN_PAGE_SIZE, BACKTEST_RUN_LIMIT_CEILING))
  }
}
