// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import { buildScreeningRun } from '../fixtures/symbol-screening'

const applicationMock = { submitRun: vi.fn() }

function submissionUnderTest() {
  return useSymbolScreeningSubmission(applicationMock as unknown as Parameters<typeof useSymbolScreeningSubmission>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSymbolScreeningSubmission', () => {
  it('submits the pasted symbols with the chosen profile and clears them', async () => {
    applicationMock.submitRun.mockResolvedValue(buildScreeningRun(12, 'queued').toDomain().toDto())
    const submission = submissionUnderTest()
    submission.profileId.value = 1
    submission.symbols.value = 'linkusdt，ADAUSDT'

    const submitted = await submission.submit()

    expect(applicationMock.submitRun).toHaveBeenCalledWith(new SymbolScreeningRunSubmissionDto(1, 'linkusdt，ADAUSDT'))
    expect(submitted?.id).toBe(12)
    expect(submission.symbols.value).toBe('')
  })

  it.each([
    ['BTC-USDT', '篩選的要求不正確: BTC-USDT 只能有英文字母與數字'],
    ['LINKUSDT', '你已經有一筆篩選在排隊或進行中，等它結束再送'],
    ['', '篩選的要求不正確: 沒有任何標的'],
  ])('keeps "%s" and shows the refusal %s', async (pasted, message) => {
    applicationMock.submitRun.mockRejectedValue(new BackendRequestRejectedError(message, { status: 400 }))
    const submission = submissionUnderTest()
    submission.profileId.value = 1
    submission.symbols.value = pasted

    const submitted = await submission.submit()

    expect(submitted).toBeNull()
    expect(submission.symbols.value).toBe(pasted)
    expect(submission.failureMessage.value?.in('zh-TW')).toBe(message)
    expect(submission.submitting.value).toBe(false)
  })

  it('submits nothing without a profile', async () => {
    const submission = submissionUnderTest()

    expect(await submission.submit()).toBeNull()
    expect(applicationMock.submitRun).not.toHaveBeenCalled()
  })
})
