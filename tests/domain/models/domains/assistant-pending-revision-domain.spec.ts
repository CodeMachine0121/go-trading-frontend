import { describe, expect, it } from 'vitest'
import { AssistantPendingRevision } from '~/domain/models/entities/assistant-pending-revision'
import type { AssistantPendingRevisionStatus } from '~/domain/models/entities/assistant-pending-revision-status'

const PROPOSED_AT = new Date('2026-09-26T08:00:00Z')

function revisionOf(subjectKind: string, status: AssistantPendingRevisionStatus) {
  return new AssistantPendingRevision(70, subjectKind, '二十根均線', '{}', status, PROPOSED_AT)
}

describe('AssistantPendingRevisionDomain', () => {
  it.each([
    { subjectKind: 'strategyScript', status: 'pending' as const, title: '策略腳本「二十根均線」', statusLabel: '等你確認', canResolve: true },
    { subjectKind: 'tradingStrategy', status: 'pending' as const, title: '交易策略「二十根均線」', statusLabel: '等你確認', canResolve: true },
    { subjectKind: 'strategyScript', status: 'confirmed' as const, title: '策略腳本「二十根均線」', statusLabel: '已確認', canResolve: false },
    { subjectKind: 'strategyScript', status: 'rejected' as const, title: '策略腳本「二十根均線」', statusLabel: '已拒絕', canResolve: false },
    { subjectKind: 'strategyScript', status: 'unknown' as const, title: '策略腳本「二十根均線」', statusLabel: '已處理', canResolve: false },
    { subjectKind: 'strategyBot', status: 'pending' as const, title: '項目「二十根均線」', statusLabel: '等你確認', canResolve: true },
  ])('$subjectKind / $status → $title · $statusLabel', ({ subjectKind, status, title, statusLabel, canResolve }) => {
    const revisionDto = revisionOf(subjectKind, status).toDomain().toDto()

    expect(revisionDto.id).toBe(70)
    expect(revisionDto.title.in('zh-TW')).toBe(title)
    expect(revisionDto.statusLabel.in('zh-TW')).toBe(statusLabel)
    expect(revisionDto.canResolve).toBe(canResolve)
    expect(revisionDto.tone).toBe(canResolve ? 'warning' : 'neutral')
    expect(revisionDto.content).toBe('{}')
    expect(revisionDto.proposedAt).toEqual(PROPOSED_AT)
  })

  it.each([
    { subjectKind: 'strategyScript', status: 'pending' as const, title: 'Strategy script "二十根均線"', statusLabel: 'Awaiting your confirmation' },
    { subjectKind: 'tradingStrategy', status: 'confirmed' as const, title: 'Trading strategy "二十根均線"', statusLabel: 'Confirmed' },
    { subjectKind: 'strategyScript', status: 'rejected' as const, title: 'Strategy script "二十根均線"', statusLabel: 'Rejected' },
    { subjectKind: 'strategyBot', status: 'unknown' as const, title: 'Item "二十根均線"', statusLabel: 'Handled' },
  ])('英文：$subjectKind / $status → $title · $statusLabel', ({ subjectKind, status, title, statusLabel }) => {
    // 名字是使用者取的，不翻；翻的只有操作台說它是哪一種、在哪個狀態。
    const revisionDto = revisionOf(subjectKind, status).toDomain().toDto()

    expect(revisionDto.title.in('en')).toBe(title)
    expect(revisionDto.statusLabel.in('en')).toBe(statusLabel)
  })
})
