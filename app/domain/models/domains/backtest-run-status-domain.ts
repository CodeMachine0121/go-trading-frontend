import type { BacktestRunStatus } from '~/domain/models/vo/backtest-run-status-vo'
import { BACKTEST_RUN_STATUSES, FALLBACK_BACKTEST_RUN_STATUS } from '~/domain/models/vo/backtest-run-status-vo'
import type { BacktestRunStatusTone } from '~/domain/models/vo/backtest-run-status-tone-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { BacktestRunStatusOptionDto } from '~/domain/models/dto/backtest-run-status-option-dto'

const STATUS_PRESENTATIONS: Readonly<Record<BacktestRunStatus, { label: LocalizedTextVo, tone: BacktestRunStatusTone }>> = {
  queued: { label: new LocalizedTextVo('排隊中', 'Queued'), tone: 'neutral' },
  running: { label: new LocalizedTextVo('進行中', 'Running'), tone: 'info' },
  succeeded: { label: new LocalizedTextVo('完成', 'Succeeded'), tone: 'success' },
  failed: { label: new LocalizedTextVo('失敗', 'Failed'), tone: 'danger' },
  cancelled: { label: new LocalizedTextVo('已取消', 'Cancelled'), tone: 'neutral' },
}

const ACTIVE_STATUSES: readonly BacktestRunStatus[] = ['queued', 'running']

/** Domain Model：一種輪次狀態怎麼說、什麼語氣、算不算還在進行。認不得的讀成失敗。 */
export class BacktestRunStatusDomain {
  readonly value: BacktestRunStatus

  constructor(declared: string) {
    this.value = BACKTEST_RUN_STATUSES.find(status => status === declared) ?? FALLBACK_BACKTEST_RUN_STATUS
  }

  get isActive(): boolean {
    return ACTIVE_STATUSES.includes(this.value)
  }

  label(): LocalizedTextVo {
    return STATUS_PRESENTATIONS[this.value].label
  }

  get tone(): BacktestRunStatusTone {
    return STATUS_PRESENTATIONS[this.value].tone
  }

  toOptionDto(): BacktestRunStatusOptionDto {
    return new BacktestRunStatusOptionDto(this.value, this.label())
  }
}
