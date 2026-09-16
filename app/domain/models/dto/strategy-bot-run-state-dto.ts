/**
 * DTO：一台機器人現在在做什麼，**已經算成畫面直接畫得出來的樣子**。
 *
 * 它帶的是結論而不是原始狀態，因為那四件事——四種狀態哪一種、原因怎麼講、
 * 播放還是停止、編輯給不給按——**都是同一個東西的四種讀法**。
 * 交出原始狀態讓元件自己判斷的話，總有一天會出現「顯示已停止、卻還給按停止」這種組合。
 */
export class StrategyBotRunStateDto {
  constructor(
    public readonly isRunning: boolean,
    /** 被系統自己停下來的——與被擁有者按停止是兩件事。 */
    public readonly isHalted: boolean,
    /** 上一輪兩個條件同時成立。**不是停擺**，機器人還在跑。 */
    public readonly isConflicting: boolean,
    public readonly statusLabel: string,
    /** 標籤的語氣。**它是規則不是樣式**：停擺要比已停止更醒目。 */
    public readonly statusTone: 'success' | 'danger' | 'neutral',
    /** 停擺原因那一句。沒有停擺時是空字串。 */
    public readonly haltReasonLabel: string,
    /** 上次訊號那一格。沒送過時是「還沒送出過」，不是空白。 */
    public readonly lastSentSignalLabel: string,
    public readonly canStart: boolean,
    public readonly canStop: boolean,
    public readonly canEdit: boolean,
    /** 編輯不給按時要說的那一句。給得出理由，那顆灰掉的鍵才不是個謎。 */
    public readonly editBlockedReason: string,
  ) {}
}
