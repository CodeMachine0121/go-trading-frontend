import type { SymbolScreeningRunStatus } from '~/domain/models/vo/symbol-screening-run-status-vo'
import { FALLBACK_SYMBOL_SCREENING_RUN_STATUS, SYMBOL_SCREENING_RUN_STATUSES } from '~/domain/models/vo/symbol-screening-run-status-vo'
import type { SymbolScreeningTone } from '~/domain/models/vo/symbol-screening-tone-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const STATUS_PRESENTATIONS: Readonly<Record<SymbolScreeningRunStatus, { label: LocalizedTextVo, tone: SymbolScreeningTone }>> = {
  queued: { label: new LocalizedTextVo('排隊中', 'Queued'), tone: 'neutral' },
  running: { label: new LocalizedTextVo('進行中', 'Running'), tone: 'info' },
  succeeded: { label: new LocalizedTextVo('完成', 'Succeeded'), tone: 'success' },
  failed: { label: new LocalizedTextVo('失敗', 'Failed'), tone: 'danger' },
  cancelled: { label: new LocalizedTextVo('已取消', 'Cancelled'), tone: 'neutral' },
}

const ACTIVE_STATUSES: readonly SymbolScreeningRunStatus[] = ['queued', 'running']

export class SymbolScreeningRunStatusDomain {
  readonly value: SymbolScreeningRunStatus

  constructor(declared: string) {
    this.value = SYMBOL_SCREENING_RUN_STATUSES.find(status => status === declared) ?? FALLBACK_SYMBOL_SCREENING_RUN_STATUS
  }

  get isActive(): boolean {
    return ACTIVE_STATUSES.includes(this.value)
  }

  get label(): LocalizedTextVo {
    return STATUS_PRESENTATIONS[this.value].label
  }

  get tone(): SymbolScreeningTone {
    return STATUS_PRESENTATIONS[this.value].tone
  }
}
