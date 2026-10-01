import type { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import { ContractTradeDirectionDomain } from '~/domain/models/domains/contract-trade-direction-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const JOURNAL_PATH = '/contract-trade-journal'
const MISSING_REFERENCE_NOTICE = new LocalizedTextVo(
  '這一輪沒有記下參考價，請手動填寫進場價與數量',
  'This run recorded no reference price; enter the entry price and quantity yourself')

export class ContractTradePrefillDomain {
  constructor(private readonly prefill: ContractTradePrefill) {}

  toDto(): ContractTradePrefillDto {
    const referencePrice = this.prefill.referencePrice
    const addsToExistingTrade = this.prefill.mode === 'addEntryFill' && this.prefill.targetTradeId !== null
    const direction = new ContractTradeDirectionDomain(this.prefill.direction, this.prefill.leverage)
    const missingReferenceNotice = referencePrice === null ? MISSING_REFERENCE_NOTICE : null

    return new ContractTradePrefillDto(
      this.prefill.journalLinkIdentifier,
      addsToExistingTrade ? 'addEntryFill' : 'newTrade',
      addsToExistingTrade ? this.prefill.targetTradeId : null,
      addsToExistingTrade ? `${JOURNAL_PATH}/${this.prefill.targetTradeId}` : null,
      new LocalizedTextVo(
        `來自 ${this.prefill.strategyBotName}・第 ${this.prefill.runNumber} 輪`,
        `From ${this.prefill.strategyBotName} · run ${this.prefill.runNumber}`),
      this.prefill.ranAt,
      referencePrice === null ? null : new JournalNumberDomain(referencePrice).price(),
      addsToExistingTrade
        ? new LocalizedTextVo(
            `${this.prefill.symbol} ${direction.word.traditionalChinese}已有持倉中的 #${this.prefill.targetTradeId}，這一輪記成加碼`,
            `An open ${this.prefill.symbol} ${direction.word.english.toLowerCase()} (#${this.prefill.targetTradeId}) already exists; this run is recorded as an add`)
        : missingReferenceNotice,
      this.prefill.symbol,
      this.prefill.direction,
      this.prefill.leverage,
      this.prefill.plannedStopLossPrice,
      this.prefill.plannedTakeProfitPrice,
      this.prefill.tradingStrategyId,
      referencePrice,
      referencePrice === null ? null : this.prefill.suggestedQuantity,
      direction.label,
      direction.tone,
    )
  }
}
