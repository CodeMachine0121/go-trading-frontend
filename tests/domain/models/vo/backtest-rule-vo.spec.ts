import { describe, expect, it } from 'vitest'
import { BACKTEST_RULES } from '~/domain/models/vo/backtest-rule-vo'
import { TRADING_MODES } from '~/domain/models/vo/trading-mode-vo'
import { TradingModeDomain } from '~/domain/models/domains/trading-mode-domain'

/** 整份說明攤成一段文字，因為讀的人也是一次讀完它。 */
function guideText(): string {
  return BACKTEST_RULES.map(rule => `${rule.title} ${rule.description}`).join('\n')
}

describe('回測照什麼規則走', () => {
  // 這份說明就掛在表單旁邊一顆鍵後面，而它是一段沒有人指著的散文。
  // 它曾經寫著「賣出完全對稱」——在現貨模式下那是假的，而使用者會照著它做決定。
  it('說得出交易模式決定「賣出」是什麼意思', () => {
    const text = guideText()

    for (const mode of TRADING_MODES) {
      expect(text).toContain(new TradingModeDomain(mode).toOptionDto().label)
    }
    expect(text).toContain('預設')
  })

  it('不再說賣出與買入完全對稱', () => {
    // 對稱只在多空反手成立。留著這句話，選了現貨的人會讀到一條與他無關的規則。
    expect(guideText()).not.toContain('賣出完全對稱')
  })

  it('現貨那一段說得出它不開空、賣出回現金', () => {
    const text = guideText()

    expect(text).toContain('不開空')
    expect(text).toContain('平倉')
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
