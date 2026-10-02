import { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'
import type { AssistantPendingRevision } from '~/domain/models/entities/assistant-pending-revision'
import type { AssistantPendingRevisionStatus } from '~/domain/models/entities/assistant-pending-revision-status'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const SUBJECT_KIND_LABELS: Readonly<Record<string, LocalizedTextVo>> = {
  strategyScript: new LocalizedTextVo('策略腳本', 'Strategy script'),
  tradingStrategy: new LocalizedTextVo('交易策略', 'Trading strategy'),
}

const STATUS_LABELS: Readonly<Record<AssistantPendingRevisionStatus, LocalizedTextVo>> = {
  pending: new LocalizedTextVo('等你確認', 'Awaiting your confirmation'),
  confirmed: new LocalizedTextVo('已確認', 'Confirmed'),
  rejected: new LocalizedTextVo('已拒絕', 'Rejected'),
  unknown: new LocalizedTextVo('已處理', 'Handled'),
}

/** Domain Model：一筆待確認修改在畫面上怎麼說、給不給動作。 */
export class AssistantPendingRevisionDomain {
  constructor(private readonly assistantPendingRevision: AssistantPendingRevision) {}

  toDto(): AssistantPendingRevisionDto {
    const revision = this.assistantPendingRevision
    const subjectKindLabel = SUBJECT_KIND_LABELS[revision.subjectKind] ?? new LocalizedTextVo('項目', 'Item')

    return new AssistantPendingRevisionDto(
      revision.id,
      new LocalizedTextVo(
        `${subjectKindLabel.traditionalChinese}「${revision.subjectName}」`,
        `${subjectKindLabel.english} "${revision.subjectName}"`,
      ),
      revision.content,
      STATUS_LABELS[revision.status],
      revision.status === 'pending',
      revision.status === 'pending' ? 'warning' : 'neutral',
      revision.proposedAt,
    )
  }
}
