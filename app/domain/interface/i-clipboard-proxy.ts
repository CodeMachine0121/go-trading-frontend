/**
 * 介面以「能力」命名，不以供應商命名：這個能力是「把一段文字放進剪貼簿」。
 * 目前由瀏覽器的剪貼簿實作。
 * 實作在 app/infrastructure/proxy/clipboard-proxy.ts。
 */
export interface IClipboardProxy {
  /** 把這段文字放進剪貼簿。寫不進去時以 ClipboardWriteFailedError 拒絕。 */
  writeText(text: string): Promise<void>
}
