/**
 * DTO：那顆鍵能擺在哪一塊範圍裡。
 *
 * 它是畫面當下的量測（視窗多大、那顆鍵多大、邊緣要留多少），
 * 由畫面提供而不是由 domain 猜——domain 不認識視窗。
 */
export class AssistantTriggerBoundsDto {
  constructor(
    public readonly viewportWidth: number,
    public readonly viewportHeight: number,
    public readonly triggerSize: number,
    /** 邊緣至少要留多少，免得那顆鍵貼著視窗邊按不到。 */
    public readonly margin: number,
  ) {}
}
