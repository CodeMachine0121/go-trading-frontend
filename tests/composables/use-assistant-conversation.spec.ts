// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantAnswerStartedDto } from '~/domain/models/dto/assistant-answer-started-dto'
import { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import { AssistantAnswerInProgressError } from '~/domain/errors/assistant-answer-in-progress-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'
import { buildConversation, buildMessage, buildNote } from '../fixtures/assistant-conversation'

const MOMENT = new Date('2026-09-04T10:00:00.000Z')

/** 有一則在寫的時候，畫面每隔這麼久回頭問一次。與 composable 裡那個常數同一個值。 */
const POLL_INTERVAL_MILLISECONDS = 2000

const applicationMock = {
  ask: vi.fn(),
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  refreshConversation: vi.fn(),
  confirmPendingRevision: vi.fn(),
  rejectPendingRevision: vi.fn(),
}

/**
 * 記住「正在看哪一段」的地方。它在真實環境是瀏覽器儲存，這裡是一個替身——
 * 用它才測得到「整頁重新載入之後回到同一段」那一條。
 */
const preferenceMock = {
  readCurrentConversationId: vi.fn<() => number | null>(),
  writeCurrentConversationId: vi.fn(),
  forgetCurrentConversationId: vi.fn(),
}

/**
 * 替身從參數進去，不去換掉 `useNuxtApp`——換掉它會連測試環境自己要用的
 * 路由同步一起弄壞。共用狀態（`useState`）走的是真的 Nuxt runtime。
 */
function conversationUnderTest() {
  return useAssistantConversation(
    applicationMock as unknown as Parameters<typeof useAssistantConversation>[0],
    preferenceMock as unknown as Parameters<typeof useAssistantConversation>[1])
}

/** 提問被收下時後端回的那三樣。**它不是答案**。 */
function startedOf(conversationId = 7, turnId = 9): AssistantAnswerStartedDto {
  return new AssistantAnswerStartedDto(conversationId, turnId, 'running')
}

/** 一段只有提問、還在寫的對話——送出之後、答案寫完之前讀回來的樣子。 */
function runningConversation(conversationId = 7) {
  return buildConversation(conversationId, [buildMessage('ask', '問一句', null, 'running')])
}

/** 同一段寫完之後的樣子。 */
function answeredConversation(conversationId = 7) {
  return buildConversation(conversationId, [
    buildMessage('ask', '問一句'),
    buildMessage('answer', '在盤整。', buildNote()),
  ])
}

/** 同一段壞掉之後的樣子。 */
function failedConversation(conversationId = 7, reason = '助手目前沒有回應，請稍後再試') {
  return buildConversation(conversationId, [
    buildMessage('ask', '問一句', null, 'failed', reason),
  ])
}

/**
 * 每個案例都從乾淨的共用狀態開始。它是跨畫面共用的一份，
 * 所以不清掉的話上一個案例問過的話會留到下一個案例。
 */
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  applicationMock.listConversations.mockResolvedValue([])
  applicationMock.ask.mockResolvedValue(startedOf())
  applicationMock.getConversation.mockResolvedValue(answeredConversation())
  // 回頭詢問讀的是同一段對話，只是走背景那一條（不讓頂端那條進度條亮）。
  // 讓它交出與 getConversation 同一份答案，其餘案例談的就只是「讀到了什麼」；
  // 走的是哪一條，由下面專門那一組來問。
  applicationMock.refreshConversation.mockImplementation(
    (id: number) => applicationMock.getConversation(id))
  preferenceMock.readCurrentConversationId.mockReturnValue(null)
  conversationUnderTest().startNewConversation()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAssistantConversation 問一句', () => {
  it('提問先上對話串，答案讀回來才接在後面', async () => {
    // 一次回答可能好幾分鐘，那幾分鐘裡使用者得看得到自己問了什麼。
    const { messages, ask } = conversationUnderTest()

    await ask('BTCUSDT 最近走勢如何')

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
  })

  it('答案是讀那一段對話讀回來的，不是提問的回應給的', async () => {
    // 提問的回應只說「收下了」。這一條就是整個切片的形狀。
    const { ask } = conversationUnderTest()

    await ask('問一句')

    expect(applicationMock.getConversation).toHaveBeenCalledWith(7)
  })

  it('讀回來的回答帶著附註', async () => {
    const { messages, ask } = conversationUnderTest()

    await ask('問一句')

    expect(messages.value[1]?.note?.label).toBe('查了 2 次 · 份量 3184')
  })

  it('第一句問完就記住這一段是哪一段', async () => {
    // 之後的每一句都要追加在同一段，而不是每一句都開一段新的。
    applicationMock.ask.mockResolvedValue(startedOf(42))
    applicationMock.getConversation.mockResolvedValue(answeredConversation(42))
    const { conversationId, ask } = conversationUnderTest()

    await ask('問一句')

    expect(conversationId.value).toBe(42)
  })

  it('記住的那一段也交給瀏覽器記著，整頁重新載入才回得來', async () => {
    const { ask } = conversationUnderTest()

    await ask('問一句')

    expect(preferenceMock.writeCurrentConversationId).toHaveBeenCalledWith(7)
  })

  it('送出後輸入框清空', async () => {
    const { draft, ask } = conversationUnderTest()
    draft.value = '問一句'

    await ask(draft.value)

    expect(draft.value).toBe('')
  })

  it('說了等於沒說的一句連呼叫都不發生', async () => {
    const { messages, ask } = conversationUnderTest()

    await ask('   ')

    expect(applicationMock.ask).not.toHaveBeenCalled()
    expect(messages.value).toEqual([])
  })

  it('送出後重讀清單，新的那一段才會出現在最前面', async () => {
    applicationMock.listConversations.mockResolvedValue([new ConversationSummaryDto(7, MOMENT, 2)])
    const { conversations, ask } = conversationUnderTest()

    await ask('問一句')

    expect(conversations.value.map(summary => summary.id)).toEqual([7])
  })
})

// 寬螢幕的抽屜與手機上的整頁助手各自叫一次 composable，但接的必須是同一段對話：
// 在抽屜裡問過的，轉成直立走到整頁助手時要還在那裡。
describe('useAssistantConversation 抽屜與整頁是同一段對話', () => {
  it('在一處問過的一句，另一處看得到同一段、同一串', async () => {
    applicationMock.ask.mockResolvedValue(startedOf(42))
    applicationMock.getConversation.mockResolvedValue(answeredConversation(42))
    const inTheDrawer = conversationUnderTest()
    const onTheChatPage = conversationUnderTest()

    await inTheDrawer.ask('問一句')

    expect(onTheChatPage.conversationId.value).toBe(42)
    expect(onTheChatPage.messages.value.map(message => [message.role, message.content]))
      .toEqual([['ask', '問一句'], ['answer', '在盤整。']])
  })

  it('一處還沒送出的草稿，另一處也接得下去', () => {
    const inTheDrawer = conversationUnderTest()
    const onTheChatPage = conversationUnderTest()

    inTheDrawer.draft.value = '寫到一半'

    expect(onTheChatPage.draft.value).toBe('寫到一半')
  })
})

describe('useAssistantConversation 等待狀態', () => {
  it('等待是後端說的：最後一則還在寫就是在等', async () => {
    // 它以前是一個我們自己記著的旗標，整頁重新載入就沒了——
    // 而那正是使用者最可能重整的時刻。
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { pending, ask } = conversationUnderTest()

    await ask('問一句')

    expect(pending.value).toBe(true)
  })

  it('最後一則寫完就不是在等', async () => {
    const { pending, ask } = conversationUnderTest()

    await ask('問一句')

    expect(pending.value).toBe(false)
  })

  it('最後一則壞掉也不是在等——沒有東西還在寫', async () => {
    // 若把失敗算成在等，那一段對話會永遠轉圈圈，而且再也送不出下一句。
    applicationMock.getConversation.mockResolvedValue(failedConversation())
    const { pending, ask } = conversationUnderTest()

    await ask('問一句')

    expect(pending.value).toBe(false)
  })
})

describe('useAssistantConversation 回頭詢問走背景那一條', () => {
  it('剛送出一句之後讀回來的那一次是使用者在等的，回頭詢問則是背景的', async () => {
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { ask } = conversationUnderTest()

    await ask('問一句')
    expect(applicationMock.refreshConversation).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(applicationMock.refreshConversation).toHaveBeenCalledTimes(1)
    expect(applicationMock.refreshConversation).toHaveBeenCalledWith(7)
  })
})

describe('useAssistantConversation 回頭詢問', () => {
  it('有一則在寫的時候每隔幾秒回頭問一次', async () => {
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { ask } = conversationUnderTest()
    await ask('問一句')
    applicationMock.getConversation.mockClear()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(applicationMock.getConversation).toHaveBeenCalledTimes(2)
  })

  it('答案寫完時自己補上，然後停止詢問', async () => {
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { messages, pending, ask } = conversationUnderTest()
    await ask('問一句')

    applicationMock.getConversation.mockResolvedValue(answeredConversation())
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(pending.value).toBe(false)

    applicationMock.getConversation.mockClear()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)
    expect(applicationMock.getConversation).not.toHaveBeenCalled()
  })

  it('壞掉時也停止詢問', async () => {
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { ask } = conversationUnderTest()
    await ask('問一句')

    applicationMock.getConversation.mockResolvedValue(failedConversation())
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    applicationMock.getConversation.mockClear()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)
    expect(applicationMock.getConversation).not.toHaveBeenCalled()
  })

  it('沒有東西在跑就完全不問', async () => {
    // 一段全部答完的對話不該每隔兩秒打一次後端。
    const { ask } = conversationUnderTest()
    await ask('問一句')
    applicationMock.getConversation.mockClear()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 5)

    expect(applicationMock.getConversation).not.toHaveBeenCalled()
  })

  it('開新對話就取消已經排好的那一次', async () => {
    // 那一次醒來要問的是一段使用者已經不在看的對話。迴圈本來就會自己停，
    // 但留著它意味著接下來兩秒內排不進新的一次——而那正好是他挑了另一段
    // 還在寫的對話的那兩秒。
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { ask, startNewConversation } = conversationUnderTest()
    await ask('問一句')
    applicationMock.getConversation.mockClear()

    startNewConversation()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)

    expect(applicationMock.getConversation).not.toHaveBeenCalled()
  })

  it('換到另一段還在寫的對話時馬上接著問它，不必等舊的那一次先醒來', async () => {
    applicationMock.getConversation.mockResolvedValue(runningConversation(7))
    const { ask, selectConversation } = conversationUnderTest()
    await ask('問一句')

    applicationMock.getConversation.mockResolvedValue(runningConversation(9))
    await selectConversation(9)
    applicationMock.getConversation.mockClear()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(applicationMock.getConversation).toHaveBeenCalledTimes(1)
    expect(applicationMock.getConversation).toHaveBeenCalledWith(9)
  })
})

describe('useAssistantConversation 回頭詢問讀不回來時', () => {
  it('不吵使用者，下一次醒來再試一次', async () => {
    // 答案還在後端那邊寫著。這時跳一塊紅色警示，附一顆會再花一次錢的再試一次，
    // 比什麼都不說更糟——等待本身已經誠實地表示「還不知道」。
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { rejectionMessage, messages, pending, ask } = conversationUnderTest()
    await ask('問一句')

    applicationMock.getConversation.mockRejectedValueOnce(
      new BackendUnreachableError('http://localhost:8080'))
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(rejectionMessage.value).toBeNull()
    expect(pending.value).toBe(true)

    applicationMock.getConversation.mockResolvedValue(answeredConversation())
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(rejectionMessage.value).toBeNull()
  })
})

describe('useAssistantConversation 回到上次看的那一段', () => {
  it('整頁重新載入之後回到同一段，還在寫的就繼續等', async () => {
    // 這是整個切片的重點：重整之後看到的是同一件事，而不是一段空白的新對話。
    preferenceMock.readCurrentConversationId.mockReturnValue(7)
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { conversationId, messages, pending, resumeCurrentConversation } = conversationUnderTest()

    await resumeCurrentConversation()

    expect(conversationId.value).toBe(7)
    expect(messages.value.map(message => message.content)).toEqual(['問一句'])
    expect(pending.value).toBe(true)
  })

  it('回來之後繼續回頭詢問，寫完就補上', async () => {
    preferenceMock.readCurrentConversationId.mockReturnValue(7)
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { messages, resumeCurrentConversation } = conversationUnderTest()
    await resumeCurrentConversation()

    applicationMock.getConversation.mockResolvedValue(answeredConversation())
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
  })

  it('回來看到上次那一則壞掉了，再試一次送得出同一句', async () => {
    // 這正是這個切片存在的那個流程：他好幾分鐘後才回來。
    // 那一句就寫在畫面上，按下去卻什麼都沒發生是最難理解的一種壞掉。
    preferenceMock.readCurrentConversationId.mockReturnValue(7)
    applicationMock.getConversation.mockResolvedValue(failedConversation())
    const { resumeCurrentConversation, retry } = conversationUnderTest()
    await resumeCurrentConversation()

    await retry()

    expect(applicationMock.ask).toHaveBeenCalledTimes(1)
    expect(vi.mocked(applicationMock.ask).mock.calls[0]?.[0]?.question).toBe('問一句')
  })

  it('回來看到上次那一段答完了，不會憑空再送一次', async () => {
    preferenceMock.readCurrentConversationId.mockReturnValue(7)
    const { resumeCurrentConversation, retry } = conversationUnderTest()
    await resumeCurrentConversation()

    await retry()

    expect(applicationMock.ask).not.toHaveBeenCalled()
  })

  it('沒有記著哪一段就什麼都不做', async () => {
    const { conversationId, resumeCurrentConversation } = conversationUnderTest()

    await resumeCurrentConversation()

    expect(applicationMock.getConversation).not.toHaveBeenCalled()
    expect(conversationId.value).toBeNull()
  })

  it('畫面上已經有一段時不把使用者拉回舊的那一段', async () => {
    // 他剛按過開新對話或剛挑過一段，把他拉回去等於把他的選擇收回去。
    preferenceMock.readCurrentConversationId.mockReturnValue(1)
    const { conversationId, ask, resumeCurrentConversation } = conversationUnderTest()
    await ask('問一句')
    applicationMock.getConversation.mockClear()

    await resumeCurrentConversation()

    expect(applicationMock.getConversation).not.toHaveBeenCalled()
    expect(conversationId.value).toBe(7)
  })
})

describe('useAssistantConversation 那一則壞掉時', () => {
  it('後端給的那句原因出現在提問底下', async () => {
    applicationMock.getConversation.mockResolvedValue(
      failedConversation(7, '系統重新啟動時中斷了這則回答，請再問一次'))
    const { rejectionMessage, ask } = conversationUnderTest()

    await ask('問一句')

    expect(rejectionMessage.value).toBe('系統重新啟動時中斷了這則回答，請再問一次')
  })

  it('提問留在對話串上——那句原因就長在它下面', async () => {
    applicationMock.getConversation.mockResolvedValue(failedConversation())
    const { messages, ask } = conversationUnderTest()

    await ask('問一句')

    expect(messages.value.map(message => message.role)).toEqual(['ask'])
  })

  it('再試一次重送同一句，不會多一則提問', async () => {
    applicationMock.getConversation.mockResolvedValueOnce(failedConversation())
    const { messages, rejectionMessage, ask, retry } = conversationUnderTest()
    await ask('問一句')

    applicationMock.getConversation.mockResolvedValue(answeredConversation())
    await retry()

    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(rejectionMessage.value).toBeNull()
    expect(applicationMock.ask).toHaveBeenCalledTimes(2)
  })
})

describe('useAssistantConversation 送不出去時', () => {
  it.each([
    {
      name: '額度用盡',
      error: new DailyUsageAllowanceExhaustedError('今日助手用量額度已用盡，於 2026-09-05T00:00:00Z 重置'),
      expectedMessage: '2026-09-05T00:00:00Z',
    },
    {
      name: '前一則還在寫',
      error: new AssistantAnswerInProgressError('這段對話上還有一則回答正在進行中，請等它結束再問下一句'),
      expectedMessage: '正在進行中',
    },
    {
      name: '連不上後端',
      error: new BackendUnreachableError('http://localhost:8080'),
      expectedMessage: '連不上後端',
    },
    {
      name: '意料之外的錯',
      error: new Error('boom'),
      expectedMessage: 'boom',
    },
  ])('$name 各自說出自己那一句', async ({ error, expectedMessage }) => {
    // 四種分開，因為使用者要做的事不同：等到重置、等一下前一則、去啟動後端、
    // 或這是個意外。
    applicationMock.ask.mockRejectedValue(error)
    const { rejectionMessage, ask } = conversationUnderTest()

    await ask('問一句')

    expect(rejectionMessage.value).toContain(expectedMessage)
  })

  it('連錯誤都不是的東西也說得出一句話', async () => {
    // 不論丟上來的是什麼，畫面都得說一句人看得懂的話，不能是一片空白。
    applicationMock.ask.mockRejectedValue('這不是一個 Error')
    const { rejectionMessage, ask } = conversationUnderTest()

    await ask('問一句')

    expect(rejectionMessage.value).toContain('未預期的錯誤')
  })

  it('那一句回到輸入框，可以改一改再送', async () => {
    applicationMock.ask.mockRejectedValue(new BackendUnreachableError('http://localhost:8080'))
    const { draft, ask } = conversationUnderTest()

    await ask('BTCUSDT 最近走勢如何')

    expect(draft.value).toBe('BTCUSDT 最近走勢如何')
  })

  it('送不出去就不是在等——沒有東西在寫', async () => {
    // 樂觀放上去的那一則假設後端會收下。它沒收下的時候，那個假設要收回來：
    // 留著它畫面會永遠轉圈圈，而警示塊（連同它上面的再試一次）只在不等的時候出現——
    // 使用者會看到一個沒有盡頭的等待、沒有任何說明，也送不出下一句。
    applicationMock.ask.mockRejectedValue(new BackendUnreachableError('http://localhost:8080'))
    const { pending, messages, ask } = conversationUnderTest()

    await ask('問一句')

    expect(pending.value).toBe(false)
    expect(messages.value.map(message => message.role)).toEqual(['ask'])
  })

  it('送不出去之後不會有一條在背景空轉的迴圈', async () => {
    // 沒有對話可以問、也沒有東西在寫，卻每兩秒醒來一次。
    applicationMock.ask.mockRejectedValue(new BackendUnreachableError('http://localhost:8080'))
    const { ask } = conversationUnderTest()
    await ask('問一句')
    applicationMock.getConversation.mockClear()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 5)

    expect(applicationMock.getConversation).not.toHaveBeenCalled()
  })

  it('送不出去之後再試一次真的再送一次', async () => {
    applicationMock.ask.mockRejectedValueOnce(new BackendUnreachableError('http://localhost:8080'))
    const { messages, rejectionMessage, ask, retry } = conversationUnderTest()
    await ask('問一句')

    await retry()

    expect(applicationMock.ask).toHaveBeenCalledTimes(2)
    expect(rejectionMessage.value).toBeNull()
    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
  })

  it('還沒問過任何一句時，再試一次什麼都不做', async () => {
    const { retry } = conversationUnderTest()

    await retry()

    expect(applicationMock.ask).not.toHaveBeenCalled()
  })
})

describe('useAssistantConversation 換對話', () => {
  it('挑一段就把它的每一則讀回來', async () => {
    applicationMock.getConversation.mockResolvedValue(answeredConversation())
    const { conversationId, messages, selectConversation } = conversationUnderTest()

    await selectConversation(7)

    expect(conversationId.value).toBe(7)
    expect(messages.value.map(message => message.role)).toEqual(['ask', 'answer'])
    expect(preferenceMock.writeCurrentConversationId).toHaveBeenCalledWith(7)
  })

  it('挑那一段失敗時，本來在寫的那一段照樣繼續問', async () => {
    // 換過去失敗了，畫面還停在本來那一段——它還在寫，沒有人去問它的話
    // 那個答案永遠不會出現。
    applicationMock.getConversation.mockResolvedValue(runningConversation(7))
    const { ask, selectConversation } = conversationUnderTest()
    await ask('問一句')

    applicationMock.getConversation.mockRejectedValueOnce(
      new BackendUnreachableError('http://localhost:8080'))
    await selectConversation(9)

    applicationMock.getConversation.mockResolvedValue(runningConversation(7))
    applicationMock.getConversation.mockClear()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(applicationMock.getConversation).toHaveBeenCalledWith(7)
  })

  it('慢一步回來的那一段不會蓋掉使用者已經換過去的那一段', async () => {
    // 取消得掉「排好的下一次」，取消不掉「已經送出去的那一次」。
    let landSlowRead: () => void = () => {}
    applicationMock.getConversation.mockImplementationOnce(
      async () => new Promise((resolve) => {
        landSlowRead = () => resolve(
          buildConversation(7, [buildMessage('ask', '慢的那一段')]))
      }))
    const { conversationId, messages, selectConversation } = conversationUnderTest()

    const slowSelect = selectConversation(7)

    applicationMock.getConversation.mockResolvedValue(
      buildConversation(9, [buildMessage('ask', '他挑的那一段')]))
    await selectConversation(9)

    landSlowRead()
    await slowSelect

    expect(conversationId.value).toBe(9)
    expect(messages.value.map(message => message.content)).toEqual(['他挑的那一段'])
  })

  it('挑到一段還在寫的就接著等下去', async () => {
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const { pending, selectConversation } = conversationUnderTest()

    await selectConversation(7)

    expect(pending.value).toBe(true)
  })

  it('那一段不在了就明說並退回一段新的', async () => {
    // 停在一個讀不到內容的對話上，使用者只會反覆按它。
    applicationMock.getConversation.mockRejectedValue(new ConversationNotFoundError('找不到'))
    const { conversationId, messages, rejectionMessage, selectConversation } = conversationUnderTest()

    await selectConversation(99)

    expect(conversationId.value).toBeNull()
    expect(messages.value).toEqual([])
    expect(rejectionMessage.value).toContain('找不到這段對話')
  })

  it('開新對話把畫面清回起點，也忘掉記著的那一段', async () => {
    const { messages, conversationId, draft, ask, startNewConversation } = conversationUnderTest()
    await ask('問一句')

    startNewConversation()

    expect(messages.value).toEqual([])
    expect(conversationId.value).toBeNull()
    expect(draft.value).toBe('')
    expect(preferenceMock.forgetCurrentConversationId).toHaveBeenCalled()
  })
})

describe('useAssistantConversation 對話清單', () => {
  it('讀得到就照後端給的順序放著', async () => {
    applicationMock.listConversations.mockResolvedValue([
      new ConversationSummaryDto(2, MOMENT, 4),
      new ConversationSummaryDto(1, MOMENT, 2),
    ])
    const { conversations, conversationsErrorMessage, loadConversations } = conversationUnderTest()

    await loadConversations()

    expect(conversations.value.map(summary => summary.id)).toEqual([2, 1])
    expect(conversationsErrorMessage.value).toBeNull()
  })

  it('取不到與一段都沒有是兩個狀態', async () => {
    // 用一個空清單同時表示兩者，會讓後端掛掉時看起來像「你還沒問過任何問題」。
    applicationMock.listConversations.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080'))
    const { conversations, conversationsErrorMessage, loadConversations } = conversationUnderTest()

    await loadConversations()

    expect(conversations.value).toEqual([])
    expect(conversationsErrorMessage.value).toContain('連不上後端')
  })
})

/** 最後一則回答帶著一筆、狀態如其所述的待確認修改。 */
function conversationWithRevision(statusLabel: string) {
  const answer = buildMessage('answer', '已提出。')

  return buildConversation(7, [
    buildMessage('ask', '改一下'),
    new ConversationMessageDto(answer.role, answer.content, answer.blocks, answer.createdAt, answer.status,
      answer.note, answer.failureReason,
      [new AssistantPendingRevisionDto(70, '策略腳本「二十根均線」', '{}', statusLabel, statusLabel === '等你確認', MOMENT)]),
  ])
}

describe('useAssistantConversation 確認與拒絕一筆待確認修改', () => {
  it.each([
    { resolution: 'confirm' as const },
    { resolution: 'reject' as const },
  ])('$resolution 之後重讀這段對話，狀態由後端說了算', async ({ resolution }) => {
    const conversation = conversationUnderTest()
    await conversation.selectConversation(7)
    applicationMock.getConversation.mockClear()
    applicationMock.getConversation.mockResolvedValue(conversationWithRevision(resolution === 'confirm' ? '已確認' : '已拒絕'))

    await (resolution === 'confirm'
      ? conversation.confirmPendingRevision(70)
      : conversation.rejectPendingRevision(70))

    const called = resolution === 'confirm'
      ? applicationMock.confirmPendingRevision
      : applicationMock.rejectPendingRevision
    expect(called).toHaveBeenCalledWith(70)
    expect(applicationMock.getConversation).toHaveBeenCalledWith(7)
    expect(conversation.resolvingPendingRevisionId.value).toBeNull()
    expect(conversation.messages.value.at(-1)?.pendingRevisions[0]?.statusLabel)
      .toBe(resolution === 'confirm' ? '已確認' : '已拒絕')
  })

  it('結果回來之前不再送出任何一次', async () => {
    let finishConfirmation: (value: unknown) => void = () => {}
    applicationMock.confirmPendingRevision.mockReturnValue(new Promise((resolve) => {
      finishConfirmation = resolve
    }))
    const conversation = conversationUnderTest()

    const firstPress = conversation.confirmPendingRevision(70)
    await conversation.confirmPendingRevision(70)
    await conversation.rejectPendingRevision(70)

    expect(conversation.resolvingPendingRevisionId.value).toBe(70)
    expect(applicationMock.confirmPendingRevision).toHaveBeenCalledTimes(1)
    expect(applicationMock.rejectPendingRevision).not.toHaveBeenCalled()

    finishConfirmation(undefined)
    await firstPress
  })

  it.each([
    {
      name: '被擋下時那一筆底下是後端那一句',
      failure: new Error('這幾台機器人正在用它跑：早盤突破，請先停止它們'),
      expectedMessage: '這幾台機器人正在用它跑：早盤突破，請先停止它們',
    },
    {
      name: '連不上後端時說連不上',
      failure: new BackendUnreachableError('fetch failed'),
      expectedMessage: '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。',
    },
  ])('$name，而且可以再按', async ({ failure, expectedMessage }) => {
    applicationMock.confirmPendingRevision.mockRejectedValueOnce(failure)
    const conversation = conversationUnderTest()

    await conversation.confirmPendingRevision(70)

    expect(conversation.pendingRevisionErrors.value[70]).toBe(expectedMessage)
    expect(conversation.resolvingPendingRevisionId.value).toBeNull()

    await conversation.confirmPendingRevision(70)

    expect(applicationMock.confirmPendingRevision).toHaveBeenCalledTimes(2)
    expect(conversation.pendingRevisionErrors.value[70]).toBeUndefined()
  })
})

describe('useAssistantConversation 一筆被擋下時留下的那一句', () => {
  it.each([
    { name: '重讀這段對話成功之後清掉', act: (conversation: ReturnType<typeof conversationUnderTest>) => conversation.selectConversation(7) },
    { name: '開一段新對話時清掉', act: async (conversation: ReturnType<typeof conversationUnderTest>) => conversation.startNewConversation() },
  ])('$name', async ({ act }) => {
    applicationMock.confirmPendingRevision.mockRejectedValueOnce(new Error('這筆修改已經處理過了'))
    const conversation = conversationUnderTest()
    await conversation.confirmPendingRevision(70)
    expect(conversation.pendingRevisionErrors.value[70]).toBe('這筆修改已經處理過了')

    await act(conversation)

    expect(conversation.pendingRevisionErrors.value).toEqual({})
  })

  it('回頭詢問讀回來之後也清掉', async () => {
    applicationMock.ask.mockResolvedValue(startedOf())
    applicationMock.getConversation.mockResolvedValue(runningConversation())
    const conversation = conversationUnderTest()
    await conversation.ask('問一句')
    applicationMock.confirmPendingRevision.mockRejectedValueOnce(new Error('這筆修改已經處理過了'))
    await conversation.confirmPendingRevision(70)
    applicationMock.getConversation.mockResolvedValue(answeredConversation())

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(conversation.pendingRevisionErrors.value).toEqual({})
  })
})
