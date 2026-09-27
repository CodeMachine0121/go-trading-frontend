import type { ContractTradeBadgeTone } from '~/domain/models/vo/contract-trade-badge-tone-vo'

export class ContractTradeTagChipVo {
  constructor(
    public readonly name: string,
    public readonly tone: ContractTradeBadgeTone,
  ) {}
}
