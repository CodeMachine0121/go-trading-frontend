import type { IClipboardProxy } from '~/domain/interface/i-clipboard-proxy'

/**
 * Domain Service：複製一段文字。
 *
 * 它只有一條規則，但那條規則是真的：**沒有東西可以複製時不去碰剪貼簿**。
 * 空的一次複製若照樣走出去，成功的話會把使用者原本剪貼簿裡的東西清掉——
 * 那是他還要用的東西；失敗的話則會冒出一句他完全無法理解的錯誤。
 */
export class ClipboardService {
  constructor(private readonly clipboardProxy: IClipboardProxy) {}

  /** 複製這段文字。空白的一段什麼都不做，並回報這一次沒有複製。 */
  async copyText(text: string): Promise<boolean> {
    if (text.trim() === '') {
      return false
    }

    await this.clipboardProxy.writeText(text)

    return true
  }
}
