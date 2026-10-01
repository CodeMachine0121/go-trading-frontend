import { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import type { AutoOrderRefusalReasonVo } from '~/domain/models/vo/auto-order-refusal-reason-vo'

export class AutoOrderRefusalDomain {
  constructor(
    private readonly strategyBotId: number,
    private readonly reason: AutoOrderRefusalReasonVo,
    private readonly message: string,
  ) {}

  toDto(): AutoOrderRefusalDto {
    return new AutoOrderRefusalDto(
      this.strategyBotId,
      this.message,
      this.reason === 'binanceTradingKeyNotConfigured',
    )
  }
}
