import type { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import { ContractTradeDirectionDomain } from '~/domain/models/domains/contract-trade-direction-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const JOURNAL_PATH = '/contract-trade-journal'
const MISSING_REFERENCE_NOTICE = '這一輪沒有記下參考價，請手動填寫進場價與數量'

export class ContractTradePrefillDomain {
  constructor(private readonly prefill: ContractTradePrefill) {}

  toDto(): ContractTradePrefillDto {
    const referencePrice = this.prefill.referencePrice
    const addsToExistingTrade = this.prefill.mode === 'addEntryFill' && this.prefill.targetTradeId !== null
    const directionWord = new ContractTradeDirectionDomain(this.prefill.direction, this.prefill.leverage).word
    const missingReferenceNotice = referencePrice === null ? MISSING_REFERENCE_NOTICE : null

    return new ContractTradePrefillDto(
      this.prefill.journalLinkIdentifier,
      addsToExistingTrade ? 'addEntryFill' : 'newTrade',
      addsToExistingTrade ? this.prefill.targetTradeId : null,
      addsToExistingTrade ? `${JOURNAL_PATH}/${this.prefill.targetTradeId}` : null,
      `來自 ${this.prefill.strategyBotName}・第 ${this.prefill.runNumber} 輪`,
      this.prefill.ranAt,
      referencePrice === null ? null : new JournalNumberDomain(referencePrice).price(),
      addsToExistingTrade
        ? `${this.prefill.symbol} ${directionWord}已有持倉中的 #${this.prefill.targetTradeId}，這一輪記成加碼`
        : missingReferenceNotice,
      this.prefill.symbol,
      this.prefill.direction,
      this.prefill.leverage,
      this.prefill.plannedStopLossPrice,
      this.prefill.plannedTakeProfitPrice,
      this.prefill.tradingStrategyId,
      referencePrice,
      referencePrice === null ? null : this.prefill.suggestedQuantity,
    )
  }
}
