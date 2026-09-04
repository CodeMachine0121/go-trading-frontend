import { describe, expect, it, vi } from 'vitest'
import type { IClipboardProxy } from '~/domain/interface/i-clipboard-proxy'
import { ClipboardWriteFailedError } from '~/domain/errors/clipboard-write-failed-error'
import { ClipboardService } from '~/domain/service/clipboard-service'

// 替身一律用 vi.fn() 對介面產生，不手刻 Fake class（見 .claude/rules/testing.md）
function buildProxyMock(failure: Error | null = null): IClipboardProxy {
  return {
    writeText: failure === null
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(failure),
  }
}

describe('ClipboardService.copyText', () => {
  it('把那段文字交給剪貼簿', async () => {
    const proxy = buildProxyMock()

    const copied = await new ClipboardService(proxy).copyText('sum := 0.0')

    expect(copied).toBe(true)
    expect(proxy.writeText).toHaveBeenCalledWith('sum := 0.0')
  })

  it.each([
    { name: '空字串', text: '' },
    { name: '只有空白', text: '   ' },
    { name: '只有換行', text: '\n\n' },
  ])('沒有東西可以複製時不去碰剪貼簿（$name）', async ({ text }) => {
    // 空的一次複製若照樣走出去，成功的話會把使用者原本剪貼簿裡的東西清掉——
    // 那是他還要用的東西。
    const proxy = buildProxyMock()

    const copied = await new ClipboardService(proxy).copyText(text)

    expect(copied).toBe(false)
    expect(proxy.writeText).not.toHaveBeenCalled()
  })

  it('內容本身的前後空白照樣一起複製', async () => {
    // 判斷「有沒有東西」時看的是去掉空白之後，但複製的是原樣——
    // 一段程式碼開頭的縮排是它的一部分。
    const proxy = buildProxyMock()

    await new ClipboardService(proxy).copyText('\tsum := 0.0\n')

    expect(proxy.writeText).toHaveBeenCalledWith('\tsum := 0.0\n')
  })

  it('寫不進去時往上拋，不吞掉', async () => {
    const proxy = buildProxyMock(new ClipboardWriteFailedError('複製失敗'))

    await expect(new ClipboardService(proxy).copyText('sum := 0.0'))
      .rejects.toBeInstanceOf(ClipboardWriteFailedError)
  })
})
