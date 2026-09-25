/** DTO：一筆待確認修改離開 domain 的唯一形狀。 */
export class AssistantPendingRevisionDto {
  constructor(
    public readonly id: number,
    /** 例如「策略腳本「二十根均線」」。 */
    public readonly title: string,
    public readonly content: string,
    public readonly statusLabel: string,
    /** 只有等你確認的那一筆能確認或拒絕。 */
    public readonly canResolve: boolean,
    public readonly proposedAt: Date,
  ) {}
}
