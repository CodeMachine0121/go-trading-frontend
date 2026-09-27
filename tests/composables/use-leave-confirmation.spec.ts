import { describe, expect, it, vi } from 'vitest'
import { useLeaveConfirmation } from '~/composables/use-leave-confirmation'

describe('useLeaveConfirmation', () => {
  it('沒改過就直接放行', () => {
    const confirmation = useLeaveConfirmation(() => false, vi.fn())

    expect(confirmation.shouldLeave('/contract-trade-journal')).toBe(true)
    expect(confirmation.confirmationOpen.value).toBe(false)
  })

  it('改過就先攔下並在頁面內確認；選留下時原封不動', () => {
    const navigate = vi.fn()
    const confirmation = useLeaveConfirmation(() => true, navigate)

    expect(confirmation.shouldLeave('/settings')).toBe(false)
    expect(confirmation.confirmationOpen.value).toBe(true)
    confirmation.stay()

    expect(confirmation.confirmationOpen.value).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('選離開就去原本要去的地方，而且不再攔第二次', () => {
    const navigate = vi.fn()
    const confirmation = useLeaveConfirmation(() => true, navigate)
    confirmation.shouldLeave('/settings')

    confirmation.leave()

    expect(navigate).toHaveBeenCalledWith('/settings')
    expect(confirmation.shouldLeave('/settings')).toBe(true)
  })

  it('沒有要去的地方時離開什麼都不做；存好之後放行', () => {
    const navigate = vi.fn()
    const confirmation = useLeaveConfirmation(() => true, navigate)

    confirmation.leave()
    confirmation.allowLeaving()

    expect(navigate).not.toHaveBeenCalled()
    expect(confirmation.shouldLeave('/x')).toBe(true)
  })
})
