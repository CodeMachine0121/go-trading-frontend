/**
 * DTO：那顆叫出助手的鍵擺在哪裡。
 *
 * 以**離右下角多遠**表示，不是離左上角——視窗變窄時，靠右下記著的鍵會跟著邊緣走，
 * 靠左上記著的會被推到視窗外面去。
 */
export class AssistantTriggerPositionDto {
  constructor(
    public readonly right: number,
    public readonly bottom: number,
  ) {}
}
