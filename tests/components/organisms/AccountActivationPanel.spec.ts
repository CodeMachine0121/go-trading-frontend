import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountActivationPanel from '~/components/organisms/AccountActivationPanel.vue'
import { AccountActivationInstructionDto } from '~/domain/models/dto/account-activation-instruction-dto'

const SUBJECT = 'go-trading 開通申請：alice@example.com'
const INSTRUCTION = new AccountActivationInstructionDto('gatekeeper@example.com', SUBJECT)

const copiedTexts: string[] = []

/**
 * 那兩顆複製鍵現在的樣子，由每一則測試自己擺好。
 *
 * 擺得動它，是因為那顆鍵有三種長相（可以按、剛複製好、複製失敗），
 * 而使用者真的會看到三種。固定成其中一種，就等於另外兩種沒有人看過。
 */
type CopyStub = {
  state: { value: 'idle' | 'copied' | 'failed' }
  failureMessage: { value: string | null }
}

function newCopyStub(): CopyStub {
  return { state: { value: 'idle' }, failureMessage: { value: null } }
}

/**
 * 兩顆複製鍵**各一份**狀態，因為真的那一支就是各記各的。
 *
 * 共用一份的話，「只有其中一顆失敗」這件事就演不出來——而那正是畫面上那句話
 * 要處理的情況。卡片建立它們的順序是信箱先、主旨後。
 */
const mailboxCopy = newCopyStub()
const subjectCopy = newCopyStub()

// 剪貼簿是這台機器的事，不是這張卡片的事。換掉的是那一層，卡片本身照常跑。
vi.mock('~/composables/use-copy-text', () => {
  let handedOut = 0

  return {
    useCopyText: () => {
      const stub = handedOut++ % 2 === 0 ? mailboxCopy : subjectCopy

      return {
        ...stub,
        copyText: (text: string) => {
          copiedTexts.push(text)

          return Promise.resolve()
        },
      }
    },
  }
})

beforeEach(() => {
  for (const stub of [mailboxCopy, subjectCopy]) {
    stub.state.value = 'idle'
    stub.failureMessage.value = null
  }
  copiedTexts.length = 0
})

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(AccountActivationPanel, {
    props: { instruction: INSTRUCTION, email: 'alice@example.com', ...props },
  })
}

describe('AccountActivationPanel：一張說明該怎麼辦的卡片', () => {
  it('把要寄去的信箱原字寫在畫面上', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="request-mailbox"]').text()).toBe('gatekeeper@example.com')
  })

  it('把要照抄的主旨原字寫在畫面上', () => {
    // 收信的人靠這一串認出是誰在申請，所以它要能被整串看到、整串選到。
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="request-subject"]').text()).toBe(SUBJECT)
  })

  it('複製主旨送出去的是一字不差的那一串', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="copy-subject"]').trigger('click')

    expect(copiedTexts).toEqual([SUBJECT])
  })

  it('複製信箱送出去的是那個位址', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="copy-mailbox"]').trigger('click')

    expect(copiedTexts).toEqual(['gatekeeper@example.com'])
  })

  it('那顆寄出申請開的是一封收件人與主旨都填好的信', () => {
    const wrapper = mountPanel()

    const href = wrapper.find('[data-testid="open-mail"]').attributes('href') ?? ''

    expect(href.startsWith('mailto:')).toBe(true)
    expect(decodeURIComponent(href)).toContain('gatekeeper@example.com')
    expect(decodeURIComponent(href.split('subject=')[1] ?? '')).toBe(SUBJECT)
  })

  it('重新檢查往上送一次，因為放行發生在別的地方', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="recheck"]').trigger('click')

    expect(wrapper.emitted('recheck')).toHaveLength(1)
  })

  it('檢查中那顆鍵按不下去，也說得出自己在忙', async () => {
    // 不然他會連按，而每一下都是一趟後端。
    const wrapper = mountPanel({ rechecking: true })

    expect(wrapper.find('[data-testid="recheck"]').text()).toBe('檢查中…')
    await wrapper.find('[data-testid="recheck"]').trigger('click')

    expect(wrapper.emitted('recheck')).toBeUndefined()
  })

  it('等的人也走得掉——這一頁是他唯一到得了的地方', async () => {
    const wrapper = mountPanel()

    await wrapper.find('[data-testid="sign-out"]').trigger('click')

    expect(wrapper.emitted('signOut')).toHaveLength(1)
  })

  it('連指示都沒有時，不畫一張空白的卡片', () => {
    const wrapper = mountPanel({ instruction: null })

    expect(wrapper.find('[data-testid="no-instruction"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-mail"]').exists()).toBe(false)
    // 登出與重新檢查照樣在：沒有指示不代表他被困在這裡。
    expect(wrapper.find('[data-testid="recheck"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sign-out"]').exists()).toBe(true)
  })
})

describe('AccountActivationPanel：那顆複製鍵說得出剛才發生了什麼', () => {
  it('複製成功之後那顆鍵打勾', () => {
    subjectCopy.state.value = 'copied'
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="copy-subject"]').text()).toBe('已複製')
  })

  it('複製失敗時那顆鍵說失敗，而不是假裝成功', () => {
    subjectCopy.state.value = 'failed'
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="copy-subject"]').text()).toBe('複製失敗')
  })

  it('複製失敗時另外說一句該怎麼辦——那一串還在畫面上，選得起來', () => {
    subjectCopy.state.value = 'failed'
    subjectCopy.failureMessage.value = '複製失敗，請手動選取這段內容。'
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="copy-failure"]').text())
      .toBe('複製失敗，請手動選取這段內容。')
    expect(wrapper.find('[data-testid="request-subject"]').text()).toBe(SUBJECT)
  })

  it('沒出事就不掛那一句——一句常駐的錯誤訊息，下次真的出事時沒有人會看到', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="copy-failure"]').exists()).toBe(false)
  })

  it('失敗的是信箱那一顆時，說的也是同一句話', () => {
    // 兩顆各記各的，所以「只有其中一顆失敗」是真的會發生的情況。
    mailboxCopy.failureMessage.value = '複製失敗，請手動選取這段內容。'
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="copy-failure"]').text())
      .toBe('複製失敗，請手動選取這段內容。')
  })
})
