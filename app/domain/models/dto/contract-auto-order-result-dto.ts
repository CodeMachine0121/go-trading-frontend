import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * DTO：一輪的下單結果，已經寫成畫面直接畫得出來的樣子。
 */
export class ContractAutoOrderResultDto {
  constructor(
    /** 狀態、動作、成交、止損止盈或原因，以「 · 」串成的一句。 */
    public readonly text: LocalizedTextVo,
    /** 那一句用什麼語氣。**它是規則不是樣式**：止損沒掛上時一律是危險。 */
    public readonly tone: 'success' | 'neutral' | 'warning' | 'danger',
    /** 止損或止盈沒掛上時那一行提醒；都掛上了（或本來就沒要掛）是 `null`。 */
    public readonly protectionWarning: LocalizedTextVo | null,
  ) {}
}
