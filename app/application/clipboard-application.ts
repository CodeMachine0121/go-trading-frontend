import type { ClipboardService } from '~/domain/service/clipboard-service'

/** Application：複製的用例編排。 */
export class ClipboardApplication {
  constructor(private readonly clipboardService: ClipboardService) {}

  /** 複製這段文字，並回報這一次到底有沒有複製。 */
  async copyText(text: string): Promise<boolean> {
    return this.clipboardService.copyText(text)
  }
}
