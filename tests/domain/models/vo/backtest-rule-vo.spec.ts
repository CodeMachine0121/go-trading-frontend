import { describe, expect, it } from 'vitest'
import { BACKTEST_RULES } from '~/domain/models/vo/backtest-rule-vo'

/** 整份說明攤成一段文字，因為讀的人也是一次讀完它。 */
function guideText(): string {
  return BACKTEST_RULES.map(rule => `${rule.title} ${rule.description}`).join('\n')
}

describe('回測照什麼規則走', () => {
  // 這份說明就掛在表單旁邊一顆鍵後面，而它是一段沒有人指著的散文。
  // 它曾經寫著「賣出完全對稱」——在現貨底下那是假的，而使用者會照著它做決定。
  it('說得出賣出是什麼意思', () => {
    const text = guideText()

    expect(text).toContain('平倉')
  })

  it('不再說賣出與買入完全對稱', () => {
    // 對稱只在做得了空的時候成立，而這裡做不了空。
    expect(guideText()).not.toContain('賣出完全對稱')
  })

  it('說得出這裡只做現貨，以及它做不到什麼', () => {
    // 這份說明是掛在表單旁邊一顆鍵後面的散文，沒有型別擋得住它說錯話——
    // 而它曾經整整一段在教人怎麼挑一個現在已經不存在的交易模式。
    const text = guideText()

    expect(text).toContain('只做現貨')
    expect(text).toContain('空手時聽到賣出什麼都不做')
    expect(text).toContain('開不了空倉')
    // 那四種模式的名字一個都不該再出現：讀到它們的人會去找一個找不到的選項。
    for (const goneSpelling of ['多空反手', '槓桿做多', '只做空']) {
      expect(text).not.toContain(goneSpelling)
    }

    // 「做空」單獨列出來，因為它不是一個選項的名字而是一個動作——這份說明
    // 曾經在教人這個引擎開不出來的倉位怎麼擺止損。它只准出現在說「這裡不做」
    // 的那一句裡，所以數它出現幾次，而不是問它在不在。
    expect(text.split('做空').length - 1).toBe(1)
    expect(text).toContain('借錢與做空是合約帳戶的事')
  })

  // 這三條存在的理由與交易模式那一條一字不差：這份說明曾經說過一句
  // 已經不再成立的話。它寫著「不算…止損」，而重演現在算得出來了。
  it('不再說回測一概不算止損', () => {
    expect(guideText()).not.toContain('不算手續費、滑點、止損')
  })

  it('說得出出場價位是填了才模擬、且從進場價量起', () => {
    const text = guideText()

    expect(text).toContain('留白就完全不模擬')
    expect(text).toContain('進場價')
  })

  it('說得出那三條判法——高低點、進場那一棒不判、兩個都碰到算止損', () => {
    const text = guideText()

    expect(text).toContain('最高最低價')
    expect(text).toContain('進場那一棒不判')
    expect(text).toContain('一律算止損')
  })

  it('手續費與滑點那一條還在——它們真的仍然不算', () => {
    const text = guideText()

    expect(text).toContain('手續費')
    expect(text).toContain('滑點')
  })
})
