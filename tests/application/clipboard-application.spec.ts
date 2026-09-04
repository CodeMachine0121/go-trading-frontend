import { describe, expect, it, vi } from 'vitest'
import { ClipboardApplication } from '~/application/clipboard-application'
import type { IClipboardProxy } from '~/domain/interface/i-clipboard-proxy'
import { ClipboardWriteFailedError } from '~/domain/errors/clipboard-write-failed-error'
import { ClipboardService } from '~/domain/service/clipboard-service'

/**
 * 注入**真的** domain service，只 mock 最外層的剪貼簿——
 * 測 application 時會連帶測到 service（見 .claude/rules/testing.md）。
 */
function buildApplicationUnderTest(failure: Error | null = null) {
  const proxy: IClipboardProxy = {
    writeText: failure === null
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(failure),
  }

  return {
    application: new ClipboardApplication(new ClipboardService(proxy)),
    proxy,
  }
}

describe('ClipboardApplication', () => {
  it('複製一段文字並回報有複製到', async () => {
    const { application, proxy } = buildApplicationUnderTest()

    await expect(application.copyText('sum := 0.0')).resolves.toBe(true)
    expect(proxy.writeText).toHaveBeenCalledWith('sum := 0.0')
  })

  it('沒有東西可以複製時回報沒有複製', async () => {
    const { application, proxy } = buildApplicationUnderTest()

    await expect(application.copyText('   ')).resolves.toBe(false)
    expect(proxy.writeText).not.toHaveBeenCalled()
  })

  it('寫不進去時往上拋', async () => {
    const { application } = buildApplicationUnderTest(new ClipboardWriteFailedError('複製失敗'))

    await expect(application.copyText('sum := 0.0'))
      .rejects.toBeInstanceOf(ClipboardWriteFailedError)
  })
})
