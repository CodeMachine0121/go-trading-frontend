import type { SpotTradePrefill } from '~/domain/models/entities/spot-trade-prefill'
import { SpotTradePrefillDto } from '~/domain/models/dto/spot-trade-prefill-dto'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const JOURNAL_PATH = '/spot-trade-journal'
const MISSING_REFERENCE_NOTICE = '這一輪沒有記下參考價，請手動填寫價格與數量'

export class SpotTradePrefillDomain {
  constructor(private readonly prefill: SpotTradePrefill) {}

  toDto(): SpotTradePrefillDto {
    const referencePrice = this.prefill.referencePrice
    const targetTradeId = this.prefill.targetTradeId
    const addsToExistingTrade = (this.prefill.mode === 'addBuyFill' || this.prefill.mode === 'addSellFill')
      && targetTradeId !== null
    const addFillKind = this.prefill.mode === 'addSellFill' ? 'sell' : 'buy'
    const missingReferenceNotice = referencePrice === null ? MISSING_REFERENCE_NOTICE : null

    return new SpotTradePrefillDto(
      this.prefill.journalLinkIdentifier,
      addsToExistingTrade ? this.prefill.mode : (this.prefill.mode === 'noOpenHolding' ? 'noOpenHolding' : 'newTrade'),
      addsToExistingTrade ? targetTradeId : null,
      addsToExistingTrade ? `${JOURNAL_PATH}/${targetTradeId}?addFill=${addFillKind}` : null,
      `來自 ${this.prefill.strategyBotName}・第 ${this.prefill.runNumber} 輪`,
      this.prefill.ranAt,
      referencePrice === null ? null : new JournalNumberDomain(referencePrice).price(),
      this.noticeFor(addsToExistingTrade) ?? missingReferenceNotice,
      this.prefill.signal,
      this.prefill.signal === 'buy' ? '買入' : '出場',
      this.prefill.signal === 'buy' ? 'success' : 'info',
      this.prefill.symbol,
      this.prefill.market,
      referencePrice,
      referencePrice === null ? null : this.prefill.quantity,
      this.prefill.plannedStopLossPrice,
      this.prefill.plannedTakeProfitPrice,
      this.prefill.tradingStrategyId,
    )
  }

  private noticeFor(addsToExistingTrade: boolean): string | null {
    if (this.prefill.mode === 'noOpenHolding') {
      return `沒有持有中的 ${this.prefill.symbol}，這一輪的出場沒有可以賣出的持有；要的話可以新增一筆`
    }

    if (!addsToExistingTrade) {
      return null
    }

    return this.prefill.mode === 'addSellFill'
      ? `${this.prefill.symbol} 持有中的 #${this.prefill.targetTradeId}，這一輪記成賣出`
      : `${this.prefill.symbol} 已有持有中的 #${this.prefill.targetTradeId}，這一輪記成加碼買進`
  }
}
