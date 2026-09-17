import type { AssistantTurnStatus } from '~/domain/models/entities/assistant-turn-status'

/**
 * DTO：一句提問被收下之後，呼叫端拿到的唯一形狀。
 *
 * 它帶著**落在哪一段對話**，不論呼叫端有沒有指名——一句話開出一段新對話之後，
 * 呼叫端得知道接下來要往哪一段追問、以及回頭讀哪一段才看得到答案，
 * 而它不該自己去清單裡猜。
 */
export class AssistantAnswerStartedDto {
  constructor(
    public readonly conversationId: number,
    public readonly turnId: number,
    public readonly status: AssistantTurnStatus,
  ) {}
}
