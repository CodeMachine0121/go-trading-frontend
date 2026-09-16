import type { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'

/**
 * DTO：積木抽屜裡的一塊，連同「它現在放不放得進去」。
 *
 * 放不進去的那幾塊**仍然列出來**，只是按不下去並說得出原因。整個拿掉的話，
 * 使用者看到的是一個東西變少了的抽屜，而不知道是自己碰到了上限——
 * 那正是這一刀答應要講清楚的那一類事。
 */
export class ConditionBlockOptionDto {
  constructor(
    public readonly block: ConditionBlockVo,
    /** 畫在積木上的字。 */
    public readonly label: string,
    public readonly enabled: boolean,
    /** `enabled` 為 false 時，要說的那一句。 */
    public readonly disabledReason: string,
  ) {}

  get key(): string {
    return this.block.key
  }
}
