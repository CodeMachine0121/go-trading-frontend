/**
 * DTO：domain 交給 application / .vue 元件的唯一形狀。
 * 元件只看得到 DTO，看不到 entity 與 domain model。
 *
 * 「可不可用」是業務判斷，因此標籤與語氣都在 domain 決定好；
 * 畫面只負責把 tone 接到元件的 variant，不得自己寫 `healthy ? ... : ...`。
 */
export class BackendHealthDto {
  constructor(
    public readonly healthy: boolean,
    public readonly status: string,
    public readonly checkedAt: Date,
    public readonly label: string,
    public readonly tone: 'success' | 'danger',
  ) {}
}
