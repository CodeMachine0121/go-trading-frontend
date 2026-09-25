import { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'
import type { AssistantPendingRevision } from '~/domain/models/entities/assistant-pending-revision'
import type { AssistantPendingRevisionStatus } from '~/domain/models/entities/assistant-pending-revision-status'

const SUBJECT_KIND_LABELS: Readonly<Record<string, string>> = {
  strategyScript: '策略腳本',
  tradingStrategy: '交易策略',
}

const STATUS_LABELS: Readonly<Record<AssistantPendingRevisionStatus, string>> = {
  pending: '等你確認',
  confirmed: '已確認',
  rejected: '已拒絕',
  unknown: '已處理',
}

/** Domain Model：一筆待確認修改在畫面上怎麼說、給不給動作。 */
export class AssistantPendingRevisionDomain {
  constructor(private readonly assistantPendingRevision: AssistantPendingRevision) {}

  toDto(): AssistantPendingRevisionDto {
    const revision = this.assistantPendingRevision
    const subjectKindLabel = SUBJECT_KIND_LABELS[revision.subjectKind] ?? '項目'

    return new AssistantPendingRevisionDto(
      revision.id,
      `${subjectKindLabel}「${revision.subjectName}」`,
      revision.content,
      STATUS_LABELS[revision.status],
      revision.status === 'pending',
      revision.status === 'pending' ? 'warning' : 'neutral',
      revision.proposedAt,
    )
  }
}
