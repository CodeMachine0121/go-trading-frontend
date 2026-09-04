import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClipboardProxy } from '~/infrastructure/proxy/clipboard-proxy'
import { ClipboardWriteFailedError } from '~/domain/errors/clipboard-write-failed-error'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ClipboardProxy', () => {
  it('把那段文字放進剪貼簿', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await new ClipboardProxy().writeText('sum := 0.0')

    expect(writeText).toHaveBeenCalledWith('sum := 0.0')
  })

  it('瀏覽器拒絕時說出一句人看得懂的話', async () => {
    // 非安全連線、權限被拒、這次點擊沒被算成使用者動作——對使用者是同一件事。
    // 靜靜失敗的話，他會帶著一個空的剪貼簿去貼上，然後以為是貼上的地方壞了。
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    })

    await expect(new ClipboardProxy().writeText('sum := 0.0'))
      .rejects.toBeInstanceOf(ClipboardWriteFailedError)
  })

  it('瀏覽器連剪貼簿都沒有時也是同一種失敗', async () => {
    vi.stubGlobal('navigator', {})

    await expect(new ClipboardProxy().writeText('sum := 0.0'))
      .rejects.toBeInstanceOf(ClipboardWriteFailedError)
  })
})
