import { AnswerBlockVo } from '~/domain/models/vo/answer-block-vo'
import type { AnswerBlockKind } from '~/domain/models/vo/answer-block-vo'
import { AnswerSegmentVo } from '~/domain/models/vo/answer-segment-vo'

/** 小標的寫法：行首一到六個井號加一個空白。 */
const HEADING_PATTERN = /^#{1,6}\s+(.*)$/
/** 條列的寫法：行首一個減號、星號或項目符號加一個空白。 */
const BULLET_PATTERN = /^\s*[-*•]\s+(.*)$/
/** 編號的寫法：行首一串數字加一個點或右括號，再加一個空白。 */
const ORDERED_PATTERN = /^\s*\d+[.)]\s+(.*)$/
/** 照原樣呈現的圍欄：連續三個以上的反引號自成一行。 */
const FENCE_PATTERN = /^\s*```/
/** 表格的那幾行：以直線開頭與結尾。 */
const TABLE_ROW_PATTERN = /^\s*\|.*\|\s*$/
/** 行內的強調與等寬：`**強調**` 與 `` `等寬` ``。兩者一起比對，先出現的先切。 */
const INLINE_PATTERN = /\*\*([^*]+)\*\*|`([^`]+)`/g

/**
 * Domain Model：一則訊息的原文，以及把它拆成塊與行內片段的行為。
 *
 * **提問與回答走同一條路**。提問通常只是一段白話，但讓它走同一條路的好處是
 * 對話串只有一種渲染方式——否則會多出「這一則要不要拆」這個沒有好答案的分支。
 *
 * 它獨立於「一次問答回報了什麼」（那是 AssistantAnswerDomain），因為兩者會分開改變：
 * 助手多用一種結構是這裡的事，後端多回一個數字是那裡的事。
 *
 * **為什麼自己拆而不用現成的套件**：套件的產出是標記，要顯示就得讓畫面去解析它，
 * 而助手回的內容是外部輸入——那條路上任何一個環節出錯，畫面就會被回答的內容操控。
 * 這裡的產出是「一種 + 文字」，一路到畫面都只是文字，**沒有任何一處把它當標記解讀**。
 * 代價是認得的結構有限，而那是刻意的：認不出來的一律當一段白話。
 */
export class MessageContentDomain {
  constructor(private readonly content: string) {}

  /**
   * 把原文拆成塊。空白的原文得到空清單——一則沒有內容的回答不該長出一個空段落。
   *
   * 走法是一次掃過每一行，把連續同類的行併成一塊：
   * 圍欄之間、表格的連續幾行都照原樣收成一塊，其餘依行首的記號分類。
   * 空白行是塊的分界。
   */
  toBlocks(): AnswerBlockVo[] {
    const blocks: AnswerBlockVo[] = []
    const lines = this.content.split('\n')

    let pending: string[] = []
    let pendingKind: AnswerBlockKind | null = null
    let insideFence = false

    const flush = (): void => {
      if (pendingKind === null || pending.length === 0) {
        pending = []
        pendingKind = null
        return
      }

      blocks.push(this.blockOf(pendingKind, pending))
      pending = []
      pendingKind = null
    }

    const collect = (kind: AnswerBlockKind, line: string): void => {
      if (pendingKind !== kind) {
        flush()
        pendingKind = kind
      }

      pending.push(line)
    }

    for (const line of lines) {
      // 圍欄裡的東西一個字都不解讀，連空白行也留著——那正是「照原樣」的意思。
      if (FENCE_PATTERN.test(line)) {
        if (insideFence) {
          flush()
          insideFence = false
        }
        else {
          flush()
          insideFence = true
          pendingKind = 'preformatted'
        }

        continue
      }

      if (insideFence) {
        collect('preformatted', line)
        continue
      }

      if (line.trim() === '') {
        flush()
        continue
      }

      if (TABLE_ROW_PATTERN.test(line)) {
        collect('preformatted', line)
        continue
      }

      const heading = HEADING_PATTERN.exec(line)
      if (heading !== null) {
        // 小標永遠自成一塊：兩個連著的小標是兩個小標，不是一塊裡的兩行。
        flush()
        blocks.push(this.blockOf('heading', [heading[1] ?? '']))
        continue
      }

      const bullet = BULLET_PATTERN.exec(line)
      if (bullet !== null) {
        collect('bulletList', bullet[1] ?? '')
        continue
      }

      const ordered = ORDERED_PATTERN.exec(line)
      if (ordered !== null) {
        collect('orderedList', ordered[1] ?? '')
        continue
      }

      collect('paragraph', line)
    }

    flush()

    return blocks
  }

  /**
   * 一塊的每一行拆成行內片段。照原樣呈現的那一種**不拆**——
   * 它的重點就是原樣，在裡面認記號等於沒有照原樣。
   */
  private blockOf(kind: AnswerBlockKind, lines: readonly string[]): AnswerBlockVo {
    if (kind === 'preformatted') {
      return new AnswerBlockVo(kind, lines.map(line => [new AnswerSegmentVo('text', line)]))
    }

    return new AnswerBlockVo(kind, lines.map(line => this.segmentsOf(line)))
  }

  /**
   * 一行文字拆成普通、強調與等寬三種片段。
   *
   * 記號本身不會留在文字裡，而**沒有配對成功的記號一律當普通文字**——
   * 一個落單的星號是使用者會看到的星號，不是一個沒關起來的強調。
   */
  private segmentsOf(line: string): AnswerSegmentVo[] {
    const segments: AnswerSegmentVo[] = []
    let cursor = 0

    for (const match of line.matchAll(INLINE_PATTERN)) {
      const start = match.index

      if (start > cursor) {
        segments.push(new AnswerSegmentVo('text', line.slice(cursor, start)))
      }

      const strongText = match[1]
      segments.push(strongText === undefined
        ? new AnswerSegmentVo('code', match[2] ?? '')
        : new AnswerSegmentVo('strong', strongText))

      cursor = start + match[0].length
    }

    if (cursor < line.length) {
      segments.push(new AnswerSegmentVo('text', line.slice(cursor)))
    }

    return segments
  }
}
