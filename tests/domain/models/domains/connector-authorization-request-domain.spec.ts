import { describe, expect, it } from 'vitest'
import { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'

describe('ConnectorAuthorizationRequestDomain', () => {
  it.each([
    { clientName: 'Claude Code', expected: 'Claude Code', expectedEnglish: 'Claude Code' },
    { clientName: '  Claude Code  ', expected: 'Claude Code', expectedEnglish: 'Claude Code' },
    { clientName: '', expected: '未具名的外掛', expectedEnglish: 'Unnamed connector' },
    { clientName: '   ', expected: '未具名的外掛', expectedEnglish: 'Unnamed connector' },
  ])('外掛登記為「$clientName」時稱它為「$expected」（$expectedEnglish）', (
    { clientName, expected, expectedEnglish },
  ) => {
    const dto = new ConnectorAuthorizationRequest(clientName).toDomain().toDto()

    // 外掛自己登記的名字是它的原文，不翻；只有「沒有名字」時那一句是操作台說的。
    expect(dto.clientName.in('zh-TW')).toBe(expected)
    expect(dto.clientName.in('en')).toBe(expectedEnglish)
  })
})
