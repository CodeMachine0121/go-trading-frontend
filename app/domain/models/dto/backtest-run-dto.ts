import type { BacktestRunKind } from '~/domain/models/vo/backtest-run-kind-vo'
import type { BacktestRunStatus } from '~/domain/models/vo/backtest-run-status-vo'
import type { BacktestRunStatusTone } from '~/domain/models/vo/backtest-run-status-tone-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** DTO：列表上的一筆輪次——狀態、進度、要跑什麼、結果一句話，都已經由領域決定好。 */
export class BacktestRunDto {
  constructor(
    public readonly id: number,
    public readonly kind: BacktestRunKind,
    public readonly status: BacktestRunStatus,
    public readonly statusLabel: LocalizedTextVo,
    public readonly statusTone: BacktestRunStatusTone,
    public readonly progressPercent: number,
    /** 狀態旁要不要寫出進度。 */
    public readonly showsProgress: boolean,
    /** 排隊中或進行中：列表要繼續跟著它。 */
    public readonly isActive: boolean,
    public readonly canCancel: boolean,
    /** 要跑什麼：標的、刻度，合約的另有槓桿與交易模式。 */
    public readonly description: LocalizedTextVo,
    public readonly subjectName: string,
    public readonly strategyScriptId: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly submittedAt: Date,
    public readonly finishedAt: Date | null,
    /** 結束之後的一句話：完成的摘要數字、失敗的原因、已取消；還沒結束是 `null`。 */
    public readonly outcome: LocalizedTextVo | null,
  ) {}
}
