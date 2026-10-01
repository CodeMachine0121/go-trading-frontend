import type { AutoOrderRefusalReasonVo } from '~/domain/models/vo/auto-order-refusal-reason-vo'

export class AutoOrderRefusedError extends Error {
  constructor(
    message: string,
    public readonly reason: AutoOrderRefusalReasonVo,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AutoOrderRefusedError'
  }
}
