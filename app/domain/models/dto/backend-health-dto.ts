/**
 * DTO：domain 交給 application / .vue 元件的唯一形狀。
 * 元件只看得到 DTO，看不到 entity 與 domain model。
 */
export class BackendHealthDto {
  constructor(
    public readonly healthy: boolean,
    public readonly status: string,
    public readonly checkedAt: Date,
  ) {}
}
