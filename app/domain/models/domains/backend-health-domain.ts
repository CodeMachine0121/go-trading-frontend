import type { BackendHealth } from '~/domain/models/entities/backend-health'
import { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

/** go-trading 的健康檢查在一切正常時回傳的狀態值（大小寫與前後空白由建構子正規化）。 */
const HEALTHY_STATUS = 'healthy'
const UNKNOWN_STATUS = 'unknown'

/**
 * Domain Model：業務行為的所在地。
 * 建構子負責正規化——後端回來的 status 可能有大小寫、空白，或整個是空字串。
 */
export class BackendHealthDomain {
  private readonly status: string
  private readonly checkedAt: Date

  constructor(backendHealth: BackendHealth) {
    const normalizedStatus = backendHealth.status.trim().toLowerCase()
    this.status = normalizedStatus === '' ? UNKNOWN_STATUS : normalizedStatus
    this.checkedAt = backendHealth.checkedAt
  }

  isHealthy(): boolean {
    return this.status === HEALTHY_STATUS
  }

  toDto(): BackendHealthDto {
    return this.isHealthy()
      ? new BackendHealthDto(true, this.status, this.checkedAt, '正常', 'success')
      : new BackendHealthDto(false, this.status, this.checkedAt, '異常', 'danger')
  }
}
