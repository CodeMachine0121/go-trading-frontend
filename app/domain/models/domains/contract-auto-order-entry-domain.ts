import Decimal from 'decimal.js'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { ContractAutoOrderResult } from '~/domain/models/entities/contract-auto-order-result'

const PART_SEPARATOR = new UntranslatedTextVo(' · ')

const ENTRY_STATUSES: ReadonlyMap<string, LocalizedTextVo> = new Map([
  ['working', new LocalizedTextVo('等待成交', 'Waiting for fill')],
  ['filled', new LocalizedTextVo('全部成交', 'Fully filled')],
  ['partiallyFilled', new LocalizedTextVo('部分成交，其餘已撤單', 'Partially filled, rest cancelled')],
  ['unfilled', new LocalizedTextVo('沒有成交，已撤單', 'Not filled, cancelled')],
])

/** Domain Model：一張限價進場單在執行紀錄上的那一行。 */
export class ContractAutoOrderEntryDomain {
  constructor(private readonly result: ContractAutoOrderResult) {}

  /** 什麼進場資訊都沒有時是 `null`，那一輪就不多畫一行。 */
  toText(): LocalizedTextVo | null {
    const status = ENTRY_STATUSES.get(this.result.entryStatus) ?? null
    const { referencePrice, entryLimitPrice, requestedQuantity, entrySlippagePercentage } = this.result
    // 掛出去之前還沒有成交量；有要求數量就讀作一點都還沒成交。
    const signedSlippage = entrySlippagePercentage === null
      ? null
      : `${entrySlippagePercentage.greaterThan(0) ? '+' : ''}${entrySlippagePercentage.toFixed()}`
    const executedQuantity = this.result.entryExecutedQuantity ?? (requestedQuantity === null ? null : new Decimal(0))

    const parts = [
      status,
      referencePrice === null
        ? null
        : new LocalizedTextVo(`參考價 ${referencePrice.toFixed()}`, `Reference ${referencePrice.toFixed()}`),
      entryLimitPrice === null
        ? null
        : new LocalizedTextVo(`限價 ${entryLimitPrice.toFixed()}`, `Limit ${entryLimitPrice.toFixed()}`),
      executedQuantity === null || requestedQuantity === null
        ? null
        : new LocalizedTextVo(
            `成交 ${executedQuantity.toFixed()}／${requestedQuantity.toFixed()}`,
            `Filled ${executedQuantity.toFixed()}/${requestedQuantity.toFixed()}`),
      signedSlippage === null
        ? null
        : new LocalizedTextVo(`滑價 ${signedSlippage}%`, `Slippage ${signedSlippage}%`),
    ]

    return parts.every(part => part === null) ? null : PART_SEPARATOR.join(parts)
  }
}
