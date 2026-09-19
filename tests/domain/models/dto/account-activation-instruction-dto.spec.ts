import { describe, expect, it } from 'vitest'
import { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'

describe('AccountActivationInstructionDto：把指示變成一封填好的信', () => {
  it('收件人與主旨都已經填好', () => {
    const instruction = new AccountActivationInstructionDto(
      'gatekeeper@example.com', 'console access request: alice@example.com')

    const href = instruction.toMailtoHref()

    expect(href).toContain('mailto:gatekeeper%40example.com')
    expect(href).toContain('subject=')
  })

  it('主旨一個字都沒有被改掉，只是被編碼', () => {
    // 收信的人靠這一串認出是誰在申請。改一個字，他就對不回是誰。
    const subject = 'go-trading 開通申請：alice@example.com'
    const instruction = new AccountActivationInstructionDto('gatekeeper@example.com', subject)

    const href = instruction.toMailtoHref()

    const decoded = decodeURIComponent(href.split('subject=')[1] ?? '')
    expect(decoded).toBe(subject)
  })

  it('主旨裡的特殊字元不會提早把網址切斷', () => {
    // `&` 沒編碼的話，它後面那一段會被當成另一個參數——主旨就少了一截，
    // 而使用者按下去只會看到一封主旨被截短的信。
    const subject = 'go-trading 開通申請：a&b@example.com'
    const instruction = new AccountActivationInstructionDto('gatekeeper@example.com', subject)

    const href = instruction.toMailtoHref()

    expect(href).not.toContain('&b@example.com')
    expect(decodeURIComponent(href.split('subject=')[1] ?? '')).toBe(subject)
  })
})
