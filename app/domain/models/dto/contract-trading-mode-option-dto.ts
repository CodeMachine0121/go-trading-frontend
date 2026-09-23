import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'

/** DTO：交易模式選單上的一個選項，連同它買入與賣出各是什麼意思。 */
export class ContractTradingModeOptionDto {
  constructor(
    public readonly value: ContractTradingMode,
    public readonly label: string,
    public readonly description: string,
  ) {}
}
