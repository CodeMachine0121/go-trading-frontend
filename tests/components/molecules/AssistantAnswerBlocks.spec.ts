import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
