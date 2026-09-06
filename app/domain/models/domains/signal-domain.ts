import type { SignalVo } from '~/domain/models/vo/signal-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'

/** 一個信號在畫面上該說什麼、用什麼語氣。判斷屬於領域，畫面不自己翻譯。 */
const SIGNAL_DESCRIPTIONS: Readonly<
  Record<SignalVo, { label: string, tone: 'positive' | 'negative' | 'neutral' }>
> = {
  buy: { label: '買入', tone: 'positive' },
  sell: { label: '賣出', tone: 'negative' },
  hold: { label: '持有', tone: 'neutral' },
}

/**
 * 沒有值、或後端回報一個認不得的字串時的歸屬。
 *
 * 當成「持有」而不是丟錯或原樣顯示：一個沒見過的信號值讓整個結果畫面壞掉，
 * 遠比默默呈現「持有」更糟。與指標值種類的寬容解讀一致。
 */
const DEFAULT_SIGNAL: SignalVo = 'hold'

/**
 * Domain Model：一個信號。
 *
 * 把後端回報的信號字串讀成畫面要的東西——中文結論與上色語氣。
 * 它同時被「指標預覽的結果」與「信號讀法對照表」用到，所以獨立成型別而不是
 * 散在兩處各翻譯一次。
 */
export class SignalDomain {
  private readonly value: SignalVo

  constructor(declared: string | null) {
    const normalized = (declared ?? '').trim().toLowerCase()
    const recognized = SIGNAL_VALUES.find(candidate => candidate === normalized)

    this.value = recognized ?? DEFAULT_SIGNAL
  }

  /** 給使用者看的結論：買入／賣出／持有。 */
  label(): string {
    return SIGNAL_DESCRIPTIONS[this.value].label
  }

  /** 供畫面決定顏色：買入是好消息、賣出是壞消息、持有中性。 */
  tone(): 'positive' | 'negative' | 'neutral' {
    return SIGNAL_DESCRIPTIONS[this.value].tone
  }
}
