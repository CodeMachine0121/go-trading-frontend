import { BackendHealthDomain } from '~/domain/models/domains/backend-health-domain'

/**
 * Entity：乾淨的 Data Model，只有欄位、沒有業務邏輯。
 * 業務行為住在 BackendHealthDomain（見 .claude/rules/architecture.md）。
 */
export class BackendHealth {
  constructor(
    public readonly status: string,
    public readonly checkedAt: Date,
  ) {}

  toDomain(): BackendHealthDomain {
    return new BackendHealthDomain(this)
  }
}
