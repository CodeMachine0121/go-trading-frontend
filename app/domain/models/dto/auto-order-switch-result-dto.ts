import type { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'

export class AutoOrderSwitchResultDto {
  constructor(
    public readonly strategyBot: StrategyBotDto | null,
    public readonly refusal: AutoOrderRefusalDto | null,
  ) {}
}
