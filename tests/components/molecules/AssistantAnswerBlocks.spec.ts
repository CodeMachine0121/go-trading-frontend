// @vitest-environment nuxt
// 程式碼區塊角上那顆複製鍵問的是組裝根注入的剪貼簿，所以這一份要跑在 Nuxt runtime 裡。
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AssistantAnswerBlocks from '~/components/molecules/AssistantAnswerBlocks.vue'
import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'

/** 以真的拆解器餵進來，測的才是畫面上真正會出現的東西。 */
function mountWith(content: string) {
  return mount(AssistantAnswerBlocks, {
    props: { blocks: new MessageContentDomain(content).toBlocks() },
  })
}

describe('AssistantAnswerBlocks', () => {
  it('小標畫成小標', () => {
    const wrapper = mountWith('## 走勢摘要')

    expect(wrapper.get('[data-testid="assistant-answer-heading"]').text()).toBe('走勢摘要')
  })

  it('條列畫成一條一條，不是擠成一段', () => {
    // 帶數字的回答靠條列在組織。擠成一段的話數字就沉在裡面了。
    const wrapper = mountWith('- 收盤 110\n- 量 11')

    const items = wrapper.findAll('ul li')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toBe('收盤 110')
  })

  it('編號依序畫成編號', () => {
    const wrapper = mountWith('1. 先查標的\n2. 再查 K 線')

    expect(wrapper.findAll('ol li')).toHaveLength(2)
  })

  it('強調的字畫得比周圍重', () => {
    const wrapper = mountWith('收盤 **110**')

    expect(wrapper.get('strong').text()).toBe('110')
  })

  it('代號以等寬字呈現', () => {
    const wrapper = mountWith('查的是 `BTCUSDT`')

    expect(wrapper.get('code').text()).toBe('BTCUSDT')
  })

  it('一整段白話就是一段', () => {
    const wrapper = mountWith('BTCUSDT 最近在盤整。')

    expect(wrapper.get('[data-testid="assistant-answer-paragraph"]').text())
      .toBe('BTCUSDT 最近在盤整。')
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('同一段裡的換行留著', () => {
    const wrapper = mountWith('第一行\n第二行')

    expect(wrapper.get('[data-testid="assistant-answer-paragraph"]').findAll('br'))
      .toHaveLength(1)
  })

  it('表格那幾行照原樣當文字，畫面上沒有表格', () => {
    const wrapper = mountWith('| 時間 | 收盤 |\n| --- | --- |\n| 09:00 | 110 |')

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.get('[data-testid="assistant-answer-preformatted"]').text())
      .toContain('| 09:00 | 110 |')
  })

  it('表格不會被當成程式碼——給它行號只會讓人以為可以貼去執行', () => {
    const wrapper = mountWith('| 時間 | 收盤 |\n| --- | --- |')

    expect(wrapper.find('[data-testid="assistant-answer-code"]').exists()).toBe(false)
  })
})

// 編輯器是掛載後才動態載入的，microtask 還輪不到它，所以要等一個真正的 tick。
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await flushPromises()
}

async function mountCode(content: string) {
  const wrapper = mountWith(content)
  await settle()

  return wrapper
}

describe('AssistantAnswerBlocks 的程式碼區塊', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('用的是操作台同一個程式碼區塊元件', async () => {
    // 使用者會把那段東西貼進算式編輯器。兩邊長得一樣，他才認得出那是同一種東西。
    const wrapper = await mountCode('```go\nsum := 0.0\n```')

    expect(wrapper.find('[data-testid="code-editor"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('sum := 0.0')
  })

  it('有行號，而且從第一行數起', async () => {
    // 後端說「第 12 行出錯」時，畫面上就要是那一行。
    const wrapper = await mountCode('```go\nsum := 0.0\nreturn nil\n```')

    const numbers = wrapper.findAll('.cm-gutterElement').map(gutter => gutter.text())
    expect(numbers).toContain('1')
    expect(numbers).toContain('2')
  })

  it('著色是真的上了', async () => {
    // 著色是編輯器套件自己的行為，這裡只驗它確實被套上了——
    // 沒有著色的話那整塊會是一片同色的字。
    const wrapper = await mountCode('```go\nsum := 0.0\n```')

    expect(wrapper.findAll('.cm-line span').length).toBeGreaterThan(0)
  })

  it('**改不動**——一則已經說出口的訊息不該能被改', async () => {
    // 這是這個功能唯一不能妥協的地方：唯讀不是樣式上的收斂，
    // 是編輯器本身回報自己不可編輯。
    const wrapper = await mountCode('```go\nsum := 0.0\n```')

    expect(wrapper.get('[data-testid="code-editor"]').classes())
      .toContain('app-code-editor--readonly')
    expect(wrapper.get('.cm-content').attributes('contenteditable')).toBe('false')
  })

  it('改不動也就送不出任何改動', async () => {
    // 就算有人想辦法在那塊 DOM 上敲字，也沒有一條把它寫回去的路。
    const wrapper = await mountCode('```go\nsum := 0.0\n```')

    wrapper.get('.cm-line').element.textContent = '被改掉了'
    await wrapper.get('.cm-content').trigger('input')
    await settle()

    expect(wrapper.text()).not.toContain('被改掉了')
  })

  it('圍欄上說了語言就標出來', async () => {
    // 這個操作台的程式碼區塊只認得 Go。標註是那份著色的誠實對照。
    const wrapper = await mountCode('```json\n{"symbol":"BTCUSDT"}\n```')

    expect(wrapper.get('[data-testid="assistant-answer-code-language"]').text()).toBe('json')
  })

  it('沒說語言就不標', async () => {
    const wrapper = await mountCode('```\nsum := 0.0\n```')

    expect(wrapper.find('[data-testid="assistant-answer-code-language"]').exists()).toBe(false)
  })

  it('角上那顆鍵複製的是那段程式碼本身', async () => {
    // 圍欄那三個反引號不該跟著進剪貼簿——貼進算式編輯器就是三個多出來的字元。
    const wrapper = await mountCode('```go\nsum := 0.0\nreturn nil\n```')

    await wrapper.get('[data-testid="copy-text-button"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('sum := 0.0\nreturn nil')
  })

  it('沒說語言的區塊照樣複製得走', async () => {
    // 那顆鍵跟語言標註同住一條，別讓它跟著標註一起消失。
    const wrapper = await mountCode('```\nsum := 0.0\n```')

    await wrapper.get('[data-testid="copy-text-button"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('sum := 0.0')
  })
})

describe('AssistantAnswerBlocks 面對像標記的回答', () => {
  it.each([
    { content: '<script>alert(1)</script>' },
    { content: '<img src=x onerror=alert(1)>' },
    { content: '<b>粗體</b>' },
  ])('像標記的字原樣顯示為文字，不會多出任何元素（$content）', ({ content }) => {
    // 助手回的東西是外部輸入。這一條是這個切片唯一的安全要求，
    // 也是「自己拆解、不引 markdown 套件」的理由。
    const wrapper = mountWith(content)

    expect(wrapper.text()).toContain(content)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('b').exists()).toBe(false)
  })

  it('像樣板語法的字也原樣顯示', () => {
    const wrapper = mountWith('{{ 7 * 7 }}')

    expect(wrapper.text()).toContain('{{ 7 * 7 }}')
    expect(wrapper.text()).not.toContain('49')
  })
})
