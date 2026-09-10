import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TelegramDeliveryProxy } from '~/infrastructure/proxy/telegram-delivery-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { TelegramDeliveryWriteDto } from '~/domain/models/dto/telegram-delivery-write-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'

const BASE_URL = 'http://localhost:8080'

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

function proxy() {
  return new TelegramDeliveryProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TelegramDeliveryProxy.fetchDeliverySetting', () => {
  it('把後端給的那一份收成領域看得懂的形狀', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      configured: true, chatId: '987654', botTokenTail: '1234',
    }))

    const setting = await proxy().fetchDeliverySetting()

    expect(setting.configured).toBe(true)
    expect(setting.chatId).toBe('987654')
    expect(setting.botTokenTail).toBe('1234')
  })

  it('還沒設定過是一個正常的答案，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      configured: false, chatId: '', botTokenTail: '',
    }))

    await expect(proxy().fetchDeliverySetting()).resolves.toMatchObject({ configured: false })
  })

  it('連不上後端維持連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(proxy().fetchDeliverySetting()).rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('TelegramDeliveryProxy.saveDeliverySetting', () => {
  it('用 PUT 送出去——一個人最多一份，送兩次留下的仍然是同一份', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      configured: true, chatId: '987654', botTokenTail: '1234',
    })
    vi.stubGlobal('$fetch', fetchStub)

    await proxy().saveDeliverySetting(new TelegramDeliveryWriteDto('123456:AAH', '987654'))

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me/telegram-delivery`,
      expect.objectContaining({
        method: 'PUT',
        body: { botToken: '123456:AAH', chatId: '987654' },
      }))
  })

  it('後端存不了金鑰是自己一種失敗，不是一般的拒絕', async () => {
    // 使用者要做的事完全不同：什麼都不必改。混在一起，他會把整串金鑰重貼三次。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 503, message: '系統目前無法安全保存機器人金鑰' })))

    await expect(proxy().saveDeliverySetting(new TelegramDeliveryWriteDto('123456:AAH', '987654')))
      .rejects.toBeInstanceOf(SecretSealUnavailableError)
  })

  it('其餘的拒絕維持一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '必須給一組機器人金鑰' })))

    await expect(proxy().saveDeliverySetting(new TelegramDeliveryWriteDto('', '987654')))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})

describe('TelegramDeliveryProxy.sendTestMessage', () => {
  it('送到了就回 null', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ delivered: true }))

    await expect(proxy().sendTestMessage('哈囉')).resolves.toBeNull()
  })

  it.each([
    ['credentialRejected'],
    ['destinationNotFound'],
    ['unreachable'],
    ['timedOut'],
  ])('送不出去時原樣回那個取值：%s', async (reason) => {
    // 後端對「送不出去」回的是 200 加一個原因，不是一個錯誤——那一次請求做的就是
    // 「試著送、然後回報」，而它做到了。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      delivered: false, failureReason: reason,
    }))

    await expect(proxy().sendTestMessage('哈囉')).resolves.toBe(reason)
  })

  it('後端說送不出去卻沒說是哪一種時，當成連不上', async () => {
    // 沒有第五種讓呼叫端去猜：畫面要說的是「稍後再試」，不是一片空白。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ delivered: false }))

    await expect(proxy().sendTestMessage('哈囉')).resolves.toBe('unreachable')
  })

  it('還沒設定過是自己一種失敗，不是一般的拒絕', async () => {
    // 沒有一格是錯的，是少了一個步驟——畫面要把人指向上面那張卡。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '尚未完成 Telegram 設定' })))

    await expect(proxy().sendTestMessage('哈囉'))
      .rejects.toBeInstanceOf(TelegramNotConfiguredError)
  })

  it('後端開不了金鑰的鎖時，也是那一種系統失敗', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 503, message: '系統目前無法安全保存機器人金鑰' })))

    await expect(proxy().sendTestMessage('哈囉'))
      .rejects.toBeInstanceOf(SecretSealUnavailableError)
  })
})

describe('TelegramDeliveryProxy.removeDeliverySetting', () => {
  it('用 DELETE 送出去', async () => {
    const fetchStub = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchStub)

    await proxy().removeDeliverySetting()

    expect(fetchStub).toHaveBeenCalledWith(
      `${BASE_URL}/users/me/telegram-delivery`,
      expect.objectContaining({ method: 'DELETE' }))
  })
})
