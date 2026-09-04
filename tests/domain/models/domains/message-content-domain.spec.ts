import { describe, expect, it } from 'vitest'
import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'

/** 一塊的每一行接回文字，方便斷言。行內片段怎麼切另有測試。 */
function textOf(lines: readonly (readonly { text: string }[])[]): string[] {
  return lines.map(line => line.map(segment => segment.text).join(''))
}

describe('MessageContentDomain 認得的結構', () => {
  it('一整段白話就是一段，不硬加結構', () => {
    // 助手常常就是講一句話。多長出一個小標或條列，讀起來像它在講重點，其實沒有。
    const blocks = new MessageContentDomain('BTCUSDT 最近在盤整，量也縮了。').toBlocks()

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe('paragraph')
    expect(textOf(blocks[0]!.lines)).toEqual(['BTCUSDT 最近在盤整，量也縮了。'])
  })

  it('連著的幾行是同一段，空白行才分段', () => {
    const blocks = new MessageContentDomain('第一行\n第二行\n\n另一段').toBlocks()

    expect(blocks.map(block => block.kind)).toEqual(['paragraph', 'paragraph'])
    expect(textOf(blocks[0]!.lines)).toEqual(['第一行', '第二行'])
    expect(textOf(blocks[1]!.lines)).toEqual(['另一段'])
  })

  it.each([
    { markup: '# 走勢摘要', expectedText: '走勢摘要' },
    { markup: '## 走勢摘要', expectedText: '走勢摘要' },
    { markup: '###### 走勢摘要', expectedText: '走勢摘要' },
  ])('行首的井號是小標（$markup）', ({ markup, expectedText }) => {
    const blocks = new MessageContentDomain(markup).toBlocks()

    expect(blocks[0]?.kind).toBe('heading')
    expect(textOf(blocks[0]!.lines)).toEqual([expectedText])
  })

  it('兩個連著的小標是兩個小標，不是一塊裡的兩行', () => {
    const blocks = new MessageContentDomain('## 一\n## 二').toBlocks()

    expect(blocks.map(block => block.kind)).toEqual(['heading', 'heading'])
  })

  it.each([
    { bullet: '-' },
    { bullet: '*' },
    { bullet: '•' },
  ])('連著的條列併成一塊（以 $bullet 開頭）', ({ bullet }) => {
    const blocks = new MessageContentDomain(
      `${bullet} 收盤 110\n${bullet} 量 11`).toBlocks()

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe('bulletList')
    expect(textOf(blocks[0]!.lines)).toEqual(['收盤 110', '量 11'])
  })

  it.each([
    { markup: '1. 先查標的\n2. 再查 K 線' },
    { markup: '1) 先查標的\n2) 再查 K 線' },
  ])('連著的編號併成一塊', ({ markup }) => {
    const blocks = new MessageContentDomain(markup).toBlocks()

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe('orderedList')
    expect(textOf(blocks[0]!.lines)).toEqual(['先查標的', '再查 K 線'])
  })

  it('小標、條列與段落各自成塊', () => {
    const blocks = new MessageContentDomain(
      '## 走勢摘要\n這一段在盤整。\n- 收盤 110\n- 量 11').toBlocks()

    expect(blocks.map(block => block.kind)).toEqual(['heading', 'paragraph', 'bulletList'])
  })

  it('空白的內容得到空清單，而不是一個空段落', () => {
    // 一則沒有內容的回答不該在畫面上長出一塊什麼都沒有的東西。
    expect(new MessageContentDomain('').toBlocks()).toEqual([])
    expect(new MessageContentDomain('   \n\n  ').toBlocks()).toEqual([])
  })
})

describe('MessageContentDomain 照原樣呈現的那幾行', () => {
  it('圍欄之間一個字都不解讀，連空白行也留著', () => {
    const blocks = new MessageContentDomain(
      '```\n# 這不是小標\n\n- 這不是條列\n```').toBlocks()

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe('preformatted')
    expect(textOf(blocks[0]!.lines)).toEqual(['# 這不是小標', '', '- 這不是條列'])
  })

  it('表格的那幾行照原樣當文字，不畫成表格', () => {
    // 這個切片不畫表格：窄欄裡的表格不好讀，而助手已經被要求直接講結論。
    const blocks = new MessageContentDomain(
      '| 時間 | 收盤 |\n| --- | --- |\n| 09:00 | 110 |').toBlocks()

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.kind).toBe('preformatted')
    expect(textOf(blocks[0]!.lines)).toHaveLength(3)
  })

  it('照原樣的那一塊裡，強調與等寬的記號也不切', () => {
    const blocks = new MessageContentDomain('```\n**不是強調** `不是等寬`\n```').toBlocks()

    expect(textOf(blocks[0]!.lines)).toEqual(['**不是強調** `不是等寬`'])
    expect(blocks[0]!.lines[0]!.every(segment => segment.kind === 'text')).toBe(true)
  })
})

describe('MessageContentDomain 的行內片段', () => {
  it('兩個星號之間是強調，記號本身不留在文字裡', () => {
    const blocks = new MessageContentDomain('收盤 **110**，比昨天高。').toBlocks()

    expect(blocks[0]!.lines[0]).toEqual([
      { kind: 'text', text: '收盤 ' },
      { kind: 'strong', text: '110' },
      { kind: 'text', text: '，比昨天高。' },
    ])
  })

  it('反引號之間是等寬，代號因此與句子分得開', () => {
    const blocks = new MessageContentDomain('查的是 `BTCUSDT`。').toBlocks()

    expect(blocks[0]!.lines[0]).toEqual([
      { kind: 'text', text: '查的是 ' },
      { kind: 'code', text: 'BTCUSDT' },
      { kind: 'text', text: '。' },
    ])
  })

  it('強調與等寬混在一行時各自切開', () => {
    const blocks = new MessageContentDomain('**BTCUSDT** 的 `close` 是 110').toBlocks()

    expect(blocks[0]!.lines[0]!.map(segment => segment.kind))
      .toEqual(['strong', 'text', 'code', 'text'])
  })

  it('沒有配對成功的記號一律當普通文字', () => {
    // 一個落單的星號是使用者會看到的星號，不是一個沒關起來的強調。
    const blocks = new MessageContentDomain('這裡有一個 * 星號和一個 ` 反引號').toBlocks()

    expect(blocks[0]!.lines[0]).toEqual([
      { kind: 'text', text: '這裡有一個 * 星號和一個 ` 反引號' },
    ])
  })

  it('條列的每一項也會切行內片段', () => {
    const blocks = new MessageContentDomain('- 收盤 **110**').toBlocks()

    expect(blocks[0]!.lines[0]!.map(segment => segment.kind)).toEqual(['text', 'strong'])
  })
})

describe('MessageContentDomain 面對像標記的內容', () => {
  it.each([
    { content: '<script>alert(1)</script>' },
    { content: '<img src=x onerror=alert(1)>' },
    { content: '{{ 7 * 7 }}' },
    { content: '<b>粗體</b>' },
  ])('像標記的字原樣留在文字裡（$content）', ({ content }) => {
    // 這裡只保證它一路都只是文字；「不會被當成指令執行」由渲染那一端一起守。
    const blocks = new MessageContentDomain(content).toBlocks()

    expect(blocks).toHaveLength(1)
    expect(textOf(blocks[0]!.lines)).toEqual([content])
    expect(blocks[0]!.lines[0]!.every(segment => segment.kind === 'text')).toBe(true)
  })
})
