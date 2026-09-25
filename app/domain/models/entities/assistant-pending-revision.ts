import { AssistantPendingRevisionDomain } from '~/domain/models/domains/assistant-pending-revision-domain'
import type { AssistantPendingRevisionStatus } from '~/domain/models/entities/assistant-pending-revision-status'

/** Entity：助手提出、等使用者決定的一筆修改，後端回來的原樣。 */
export class AssistantPendingRevision {
  constructor(
    public readonly id: number,
    public readonly subjectKind: string,
    public readonly subjectName: string,
    /** 改成的完整內容，已排版成給人讀的文字。 */
    public readonly content: string,
    public readonly status: AssistantPendingRevisionStatus,
    public readonly proposedAt: Date,
  ) {}

  toDomain(): AssistantPendingRevisionDomain {
    return new AssistantPendingRevisionDomain(this)
  }
}
