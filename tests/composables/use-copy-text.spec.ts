// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClipboardApplication } from '~/application/clipboard-application'
import { ClipboardService } from '~/domain/service/clipboard-service'
import { ClipboardWriteFailedError } from '~/domain/errors/clipboard-write-failed-error'
import type { IClipboardProxy } from '~/domain/interface/i-clipboard-proxy'

const clipboardProxy: IClipboardProxy = { writeText: vi.fn() }

/**
 * 注入的是**真的** application 與 service，只有最外層的剪貼簿是替身——
 * 「空的一段不複製」那條規則要是被替身頂掉，這裡就測不到按了會不會打勾。
 */
function copyUnderTest() {
  return useCopyText(new ClipboardApplication(new ClipboardService(clipboardProxy)))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.mocked(clipboardProxy.writeText).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCopyText', () => {
  it('複製成功之後打勾', async () => {
    const copy = copyUnderTest()

    await copy.copyText('sum := 0.0')

    expect(copy.state.value).toBe('copied')
    expect(copy.failureMessage.value).toBeNull()
    expect(clipboardProxy.writeText).toHaveBeenCalledWith('sum := 0.0')
  })

  it('那個勾自己退回去', async () => {
    // 一顆永遠打著勾的鍵，下一次按下去就看不出有沒有反應。
    const copy = copyUnderTest()
    await copy.copyText('sum := 0.0')

    vi.advanceTimersByTime(1999)
    expect(copy.state.value).toBe('copied')

    vi.advanceTimersByTime(1)
    expect(copy.state.value).toBe('idle')
  })

  it('沒有東西可以複製時連狀態都不動', async () => {
    // 打勾會是一句謊話：剪貼簿裡還是原本那個東西。
    const copy = copyUnderTest()

    await copy.copyText('   ')

    expect(copy.state.value).toBe('idle')
    expect(clipboardProxy.writeText).not.toHaveBeenCalled()
  })

  it('複製失敗時說出瀏覽器拒絕的那句話', async () => {
    // 靜靜失敗的話，使用者會帶著一個空的剪貼簿去貼上，然後以為是貼上的地方壞了。
    vi.mocked(clipboardProxy.writeText)
      .mockRejectedValue(new ClipboardWriteFailedError('這個瀏覽器不讓網頁碰剪貼簿。'))
    const copy = copyUnderTest()

    await copy.copyText('sum := 0.0')

    expect(copy.state.value).toBe('failed')
    // 說的是剪貼簿那一側傳回來的理由，不是這裡自己寫的那句罐頭話——
    // 兩者相同的話，這一條就分不出有沒有在聽。
    expect(copy.failureMessage.value).toBe('這個瀏覽器不讓網頁碰剪貼簿。')
  })

  it('連拒絕的理由都沒有時還是說一句話', async () => {
    vi.mocked(clipboardProxy.writeText).mockRejectedValue(new Error('boom'))
    const copy = copyUnderTest()

    await copy.copyText('sum := 0.0')

    expect(copy.state.value).toBe('failed')
    expect(copy.failureMessage.value).toBe('複製失敗，請手動選取這段內容。')
  })

  it('失敗那句話也會自己退掉', async () => {
    vi.mocked(clipboardProxy.writeText).mockRejectedValue(new Error('boom'))
    const copy = copyUnderTest()
    await copy.copyText('sum := 0.0')

    vi.advanceTimersByTime(2000)

    expect(copy.state.value).toBe('idle')
    expect(copy.failureMessage.value).toBeNull()
  })

  it('連按兩下時從後面那一下重新算', async () => {
    // 不重算的話，第二下的勾會被第一下的計時器提早收走。
    const copy = copyUnderTest()
    await copy.copyText('第一段')

    vi.advanceTimersByTime(1500)
    await copy.copyText('第二段')
    vi.advanceTimersByTime(1500)

    expect(copy.state.value).toBe('copied')
  })

  it('每一顆鍵各自記自己的', async () => {
    // 共用一份的話，按了某一段程式碼旁邊那顆，畫面上每一顆都會同時打勾，
    // 使用者會不知道自己到底複製了哪一段。
    const first = copyUnderTest()
    const second = copyUnderTest()

    await first.copyText('sum := 0.0')

    expect(first.state.value).toBe('copied')
    expect(second.state.value).toBe('idle')
  })
})
