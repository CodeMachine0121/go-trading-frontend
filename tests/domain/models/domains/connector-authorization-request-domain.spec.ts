import { describe, expect, it } from 'vitest'
import { ConnectorAuthorizationRequest } from '~/domain/models/entities/connector-authorization-request'

describe('ConnectorAuthorizationRequestDomain', () => {
  it.each([
    { clientName: 'Claude Code', expected: 'Claude Code' },
    { clientName: '  Claude Code  ', expected: 'Claude Code' },
    { clientName: '', expected: '未具名的外掛' },
    { clientName: '   ', expected: '未具名的外掛' },
  ])('外掛登記為「$clientName」時稱它為「$expected」', ({ clientName, expected }) => {
    const dto = new ConnectorAuthorizationRequest(clientName).toDomain().toDto()

    expect(dto.clientName).toBe(expected)
  })
})
