import { vi } from 'vitest'
import type { ISessionStorageProxy } from '~/domain/interface/i-session-storage-proxy'
import { Session } from '~/domain/models/entities/session'

/**
 * 一份「記著這一段登入」的替身，供每一個 proxy 的測試使用。
 *
 * 每個 proxy 現在都要它才建得起來（身分是每一發的事），而「記著什麼」對絕大多數 proxy
 * 的測試都不是重點——它們測的是端點、形狀與錯誤翻譯。所以這裡集中提供一份，
 * 免得同一段替身在九個檔案裡各寫一遍、然後各自漂移。
 */
export function signedInSessionStorage(accessToken = 'a-proof'): ISessionStorageProxy {
  return {
    readSession: vi.fn(() => new Session(
      accessToken,
      new Date('2026-09-10T09:00:00Z'),
      'a-refresh-token',
      new Date('2026-10-10T09:00:00Z'),
    )),
    writeSession: vi.fn(),
    clearSession: vi.fn(),
  }
}

/** 一份什麼都沒記著的替身——那與「還沒登入過」是同一件事。 */
export function signedOutSessionStorage(): ISessionStorageProxy {
  return {
    readSession: vi.fn(() => null),
    writeSession: vi.fn(),
    clearSession: vi.fn(),
  }
}

/**
 * 身分現在附在每一發請求上，所以每一則「送出去的長這樣」的斷言都看得到它。
 * 寫在這裡一次，是為了讓那些斷言仍然在說自己原本要說的事（端點、方法、內容），
 * 而不是每一則都多背一段標頭。
 */
export const SIGNED_IN_HEADERS = { Authorization: 'Bearer a-proof' }
