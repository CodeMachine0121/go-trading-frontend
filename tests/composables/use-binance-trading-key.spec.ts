// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'
import { BinanceTradingKeyVerificationError } from '~/domain/errors/binance-trading-key-verification-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const STORED = new BinanceTradingKeyDto(
  true, new UntranslatedTextVo('結尾 a1b2'), new UntranslatedTextVo('現貨、合約'), new Date('2026-10-01T08:00:00Z'))
const REPLACED = new BinanceTradingKeyDto(
  true, new UntranslatedTextVo('結尾 c3d4'), new UntranslatedTextVo('現貨'), new Date('2026-10-01T09:00:00Z'))
const UNCONFIGURED = new BinanceTradingKeyDto(false, null, new UntranslatedTextVo(''), null)

const binanceTradingKeyApplication = {
  loadTradingKey: vi.fn(),
  saveTradingKey: vi.fn(),
  removeTradingKey: vi.fn(),
}

function binanceTradingKeyUnderTest() {
  return useBinanceTradingKey(
    binanceTradingKeyApplication as unknown as Parameters<typeof useBinanceTradingKey>[0])
}

async function loadedWithStoredKey() {
  binanceTradingKeyApplication.loadTradingKey.mockResolvedValueOnce(STORED)
  const binanceTradingKey = binanceTradingKeyUnderTest()
  await binanceTradingKey.loadTradingKey()

  return binanceTradingKey
}

beforeEach(() => {
  vi.clearAllMocks()
  binanceTradingKeyApplication.loadTradingKey.mockResolvedValue(UNCONFIGURED)
  binanceTradingKeyApplication.saveTradingKey.mockResolvedValue(REPLACED)
  binanceTradingKeyApplication.removeTradingKey.mockResolvedValue(undefined)
})

describe('useBinanceTradingKey：讀回目前的設定', () => {
  it('未設定時兩格直接攤開', async () => {
    const { loadTradingKey, configured, formVisible } = binanceTradingKeyUnderTest()

    await loadTradingKey()

    expect(configured.value).toBe(false)
    expect(formVisible.value).toBe(true)
  })

  it('已設定時收起兩格、顯示存著的那一組', async () => {
    const { setting, formVisible } = await loadedWithStoredKey()

    expect(setting.value?.apiKeySummary?.in('zh-TW')).toBe('結尾 a1b2')
    expect(formVisible.value).toBe(false)
  })

  it('讀不到時不把它畫成「尚未設定」', async () => {
    binanceTradingKeyApplication.loadTradingKey.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080/users/me/binance-trading-key'))
    const { loadTradingKey, loadErrorMessage, configured, setting } = binanceTradingKeyUnderTest()

    await loadTradingKey()

    expect(loadErrorMessage.value?.in('zh-TW')).toContain('連不上')
    expect(setting.value).toBeNull()
    expect(configured.value).toBe(false)
  })

  it('重讀失敗時不留著上一次讀到的那一組', async () => {
    const binanceTradingKey = await loadedWithStoredKey()
    binanceTradingKeyApplication.loadTradingKey.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080/users/me/binance-trading-key'))

    await binanceTradingKey.loadTradingKey()

    expect(binanceTradingKey.setting.value).toBeNull()
  })
})

describe('useBinanceTradingKey：換一組', () => {
  it('兩格都是空的，沒有預填任何舊值', async () => {
    const binanceTradingKey = await loadedWithStoredKey()
    binanceTradingKey.apiKey.value = 'left-over'
    binanceTradingKey.secretKey.value = 'left-over'

    binanceTradingKey.startEditing()

    expect(binanceTradingKey.apiKey.value).toBe('')
    expect(binanceTradingKey.secretKey.value).toBe('')
    expect(binanceTradingKey.formVisible.value).toBe(true)
  })

  it('取消時丟掉填了一半的字，回到已存那一組', async () => {
    const binanceTradingKey = await loadedWithStoredKey()
    binanceTradingKey.startEditing()
    binanceTradingKey.apiKey.value = 'half-typed'

    binanceTradingKey.cancelEditing()

    expect(binanceTradingKey.apiKey.value).toBe('')
    expect(binanceTradingKey.formVisible.value).toBe(false)
    expect(binanceTradingKey.setting.value?.apiKeySummary?.in('zh-TW')).toBe('結尾 a1b2')
  })
})

describe('useBinanceTradingKey：存入', () => {
  it('送出兩格，成功後顯示新的那一組並清空兩格', async () => {
    const binanceTradingKey = await loadedWithStoredKey()
    binanceTradingKey.startEditing()
    binanceTradingKey.apiKey.value = 'the-api-key'
    binanceTradingKey.secretKey.value = 'the-secret-key'

    await binanceTradingKey.saveTradingKey()

    expect(binanceTradingKeyApplication.saveTradingKey).toHaveBeenCalledWith(
      new BinanceTradingKeyWriteDto('the-api-key', 'the-secret-key'))
    expect(binanceTradingKey.setting.value?.apiKeySummary?.in('zh-TW')).toBe('結尾 c3d4')
    expect(binanceTradingKey.apiKey.value).toBe('')
    expect(binanceTradingKey.secretKey.value).toBe('')
    expect(binanceTradingKey.formVisible.value).toBe(false)
  })

  it('等幣安確認期間是存入中，而且再按一次不會再送一次', async () => {
    let finishSaving: (saved: BinanceTradingKeyDto) => void = () => {}
    binanceTradingKeyApplication.saveTradingKey.mockReturnValue(
      new Promise<BinanceTradingKeyDto>((resolve) => {
        finishSaving = resolve
      }))
    const binanceTradingKey = binanceTradingKeyUnderTest()

    const firstSave = binanceTradingKey.saveTradingKey()
    expect(binanceTradingKey.saving.value).toBe(true)
    await binanceTradingKey.saveTradingKey()
    finishSaving(REPLACED)
    await firstSave

    expect(binanceTradingKeyApplication.saveTradingKey).toHaveBeenCalledOnce()
    expect(binanceTradingKey.saving.value).toBe(false)
  })

  it.each([
    { field: 'apiKey' as const, message: '必須給 API Key' },
    { field: 'secretKey' as const, message: '必須給 Secret Key' },
  ])('$field 那一格的問題掛在那一格上', async ({ field, message }) => {
    binanceTradingKeyApplication.saveTradingKey.mockRejectedValue(
      new BinanceTradingKeyFieldError(new UntranslatedTextVo(message), field))
    const binanceTradingKey = binanceTradingKeyUnderTest()

    await binanceTradingKey.saveTradingKey()

    const fieldErrors = { apiKey: binanceTradingKey.apiKeyError.value, secretKey: binanceTradingKey.secretKeyError.value }
    expect(fieldErrors[field]?.in('zh-TW')).toBe(message)
    expect(binanceTradingKey.saveErrorMessage.value).toBeNull()
  })

  it('指不出是哪一格的欄位問題照原話掛在段落上', async () => {
    binanceTradingKeyApplication.saveTradingKey.mockRejectedValue(
      new BinanceTradingKeyFieldError(new UntranslatedTextVo('invalid character in request body'), null))
    const binanceTradingKey = binanceTradingKeyUnderTest()

    await binanceTradingKey.saveTradingKey()

    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW')).toBe('invalid character in request body')
  })

  it('幣安不接受時照原話說，畫面仍是原本那一組', async () => {
    binanceTradingKeyApplication.saveTradingKey.mockRejectedValue(
      new BinanceTradingKeyVerificationError('幣安不接受這組金鑰，請確認 API Key 與 Secret Key 後重新填寫', 'keyRejected'))
    const binanceTradingKey = await loadedWithStoredKey()
    binanceTradingKey.startEditing()

    await binanceTradingKey.saveTradingKey()

    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW'))
      .toBe('幣安不接受這組金鑰，請確認 API Key 與 Secret Key 後重新填寫')
    expect(binanceTradingKey.configured.value).toBe(true)
    expect(binanceTradingKey.setting.value?.apiKeySummary?.in('zh-TW')).toBe('結尾 a1b2')
  })

  it.each([
    new BinanceTradingKeyVerificationError('這組幣安交易金鑰沒有任何交易權限，請到幣安開啟現貨或合約交易權限', 'noTradingPermission'),
    new BinanceTradingKeyVerificationError('連不上幣安，請稍後再試', 'unreachable'),
    new BinanceTradingKeyVerificationError('等幣安回答等太久，這次沒有存成，請稍後再試', 'timedOut'),
    new BackendRequestRejectedError('a rejection the screen has never seen'),
  ])('交易服務的原因照原話顯示：$message', async (error) => {
    binanceTradingKeyApplication.saveTradingKey.mockRejectedValue(error)
    const binanceTradingKey = binanceTradingKeyUnderTest()

    await binanceTradingKey.saveTradingKey()

    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW')).toBe(error.message)
  })

  it('系統目前存不了時照原話說，並說明這不是使用者填錯', async () => {
    binanceTradingKeyApplication.saveTradingKey.mockRejectedValue(
      new SecretSealUnavailableError('系統目前無法安全保存幣安交易金鑰'))
    const binanceTradingKey = binanceTradingKeyUnderTest()

    await binanceTradingKey.saveTradingKey()

    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW')).toContain('系統目前無法安全保存幣安交易金鑰')
    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW')).toContain('不是你填錯了什麼')
  })

  it('說不出原因的錯誤給一句通用的話', async () => {
    binanceTradingKeyApplication.saveTradingKey.mockRejectedValue(new Error('boom'))
    const binanceTradingKey = binanceTradingKeyUnderTest()

    await binanceTradingKey.saveTradingKey()

    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW')).toBe('與幣安交易金鑰設定往來時發生未預期的錯誤。')
  })
})

describe('useBinanceTradingKey：移除', () => {
  it('移除後重讀，回到尚未設定', async () => {
    const binanceTradingKey = await loadedWithStoredKey()

    await binanceTradingKey.removeTradingKey()

    expect(binanceTradingKeyApplication.removeTradingKey).toHaveBeenCalledOnce()
    expect(binanceTradingKey.configured.value).toBe(false)
    expect(binanceTradingKey.formVisible.value).toBe(true)
  })

  it('移除失敗時畫面仍是原本那一組', async () => {
    binanceTradingKeyApplication.removeTradingKey.mockRejectedValue(
      new BackendRequestRejectedError('移除失敗'))
    const binanceTradingKey = await loadedWithStoredKey()

    await binanceTradingKey.removeTradingKey()

    expect(binanceTradingKey.saveErrorMessage.value?.in('zh-TW')).toBe('移除失敗')
    expect(binanceTradingKey.setting.value?.apiKeySummary?.in('zh-TW')).toBe('結尾 a1b2')
  })

  it('存入進行中不會同時移除', async () => {
    binanceTradingKeyApplication.saveTradingKey.mockReturnValue(new Promise(() => {}))
    const binanceTradingKey = await loadedWithStoredKey()
    void binanceTradingKey.saveTradingKey()

    await binanceTradingKey.removeTradingKey()

    expect(binanceTradingKeyApplication.removeTradingKey).not.toHaveBeenCalled()
  })
})
