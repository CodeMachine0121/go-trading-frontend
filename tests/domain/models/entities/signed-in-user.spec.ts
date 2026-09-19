import { describe, expect, it } from 'vitest'
import { SignedInUser } from '~/domain/models/entities/signed-in-user'
import { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'

describe('SignedInUser：交出去的那一份形狀', () => {
  it('還在等的人，開通狀態與指示一起交出去', () => {
    const instruction = new AccountActivationInstructionDto('gatekeeper@example.com', '申請：a@b.c')

    const dto = new SignedInUser(7, 'a@b.c', false, instruction).toDto()

    expect(dto.id).toBe(7)
    expect(dto.email).toBe('a@b.c')
    expect(dto.isEnabled).toBe(false)
    expect(dto.activationInstruction).toBe(instruction)
  })

  it('被放行的人沒有指示——不是一份空的，是沒有', () => {
    // 一份已經不適用的指示比沒有更糟：會有人照著做。
    const dto = new SignedInUser(7, 'a@b.c', true, null).toDto()

    expect(dto.isEnabled).toBe(true)
    expect(dto.activationInstruction).toBeNull()
  })
})
