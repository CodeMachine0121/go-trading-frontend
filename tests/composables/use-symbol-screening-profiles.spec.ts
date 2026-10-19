// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { buildProfileWriteDto, buildScreeningProfile } from '../fixtures/symbol-screening'

const applicationMock = {
  listProfiles: vi.fn(),
  listScreenableStrategyScripts: vi.fn(),
  saveProfile: vi.fn(),
  deleteProfile: vi.fn(),
}

function profilesUnderTest() {
  return useSymbolScreeningProfiles(applicationMock as unknown as Parameters<typeof useSymbolScreeningProfiles>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  applicationMock.listProfiles.mockResolvedValue([buildScreeningProfile(1, '趨勢 V3')])
  applicationMock.listScreenableStrategyScripts.mockResolvedValue([])
})

describe('useSymbolScreeningProfiles', () => {
  it('loads the profiles', async () => {
    const profiles = profilesUnderTest()

    await profiles.load()

    expect(profiles.profiles.value.map(profile => profile.name)).toEqual(['趨勢 V3'])
    expect(profiles.loading.value).toBe(false)
  })

  it('says why the profiles could not be loaded', async () => {
    applicationMock.listProfiles.mockRejectedValue(new Error('讀不到'))
    const profiles = profilesUnderTest()

    await profiles.load()

    expect(profiles.failureMessage.value?.in('zh-TW')).toBe('讀不到')
  })

  it('adds a newly created profile to the list', async () => {
    applicationMock.saveProfile.mockResolvedValue(buildScreeningProfile(2, '區間 V1').toDto())
    const profiles = profilesUnderTest()
    await profiles.load()

    const saved = await profiles.save(buildProfileWriteDto())

    expect(saved).toBe(true)
    expect(profiles.profiles.value.map(profile => profile.name)).toEqual(['趨勢 V3', '區間 V1'])
  })

  it('shows the edited profile in place', async () => {
    applicationMock.listProfiles.mockResolvedValue([buildScreeningProfile(1, '趨勢 V3'), buildScreeningProfile(2, '區間 V1')])
    applicationMock.saveProfile.mockResolvedValue(buildScreeningProfile(1, '趨勢 V3', 365).toDto())
    const profiles = profilesUnderTest()
    await profiles.load()

    await profiles.save(buildProfileWriteDto({ id: 1, historyDays: '365' }))

    expect(profiles.profiles.value.map(profile => profile.terms.historyDays)).toEqual([365, 730])
  })

  it('keeps the form open with the duplicate-name refusal', async () => {
    applicationMock.saveProfile.mockRejectedValue(new BackendRequestRejectedError('已經有同名的篩選設定', { status: 409 }))
    const profiles = profilesUnderTest()
    await profiles.load()

    const saved = await profiles.save(buildProfileWriteDto())

    expect(saved).toBe(false)
    expect(profiles.saveFailureMessage.value?.in('zh-TW')).toBe('已經有同名的篩選設定')
    profiles.clearSaveFailure()
    expect(profiles.saveFailureMessage.value).toBeNull()
  })

  it('keeps a profile still in use and says why', async () => {
    applicationMock.deleteProfile.mockRejectedValue(
      new BackendRequestRejectedError('有篩選正在使用這份設定，等它結束再刪除', { status: 409 }))
    const profiles = profilesUnderTest()
    await profiles.load()

    await profiles.remove(1)

    expect(profiles.profiles.value).toHaveLength(1)
    expect(profiles.failureMessage.value?.in('zh-TW')).toBe('有篩選正在使用這份設定，等它結束再刪除')
  })

  it('removes a deleted profile', async () => {
    applicationMock.deleteProfile.mockResolvedValue(undefined)
    const profiles = profilesUnderTest()
    await profiles.load()

    await profiles.remove(1)

    expect(profiles.profiles.value).toEqual([])
  })
})
