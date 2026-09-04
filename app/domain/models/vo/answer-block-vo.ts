import type { AnswerSegmentVo } from '~/domain/models/vo/answer-segment-vo'

/**
 * 一則回答被拆解後，一塊是哪一種。
 *
 * 只有六種，而且**認不出來的一律當 `paragraph`**。寧可少認一種結構，
 * 也不為了多認一種而讓內容有機會逃出文字的身分。
 *
 * `code` 與 `preformatted` 分開，因為它們是兩種東西：
 *
 * - `code` 是助手用圍欄圈起來的一段程式碼。它值得行號與著色——
 *   使用者會把它貼進算式編輯器，而「後端說第 12 行出錯」要對得上畫面上的第 12 行。
 * - `preformatted` 是助手排的表格那幾行。它照原樣當文字呈現：那不是程式碼，
 *   給它行號只會讓人以為那是可以貼去執行的東西。
 */
export type AnswerBlockKind
  = | 'paragraph'
    | 'heading'
    | 'bulletList'
    | 'orderedList'
    | 'code'
    | 'preformatted'

/**
 * VO：一則回答被拆解後的一塊。不可變、無行為。
 *
 * 每一塊都是「一種 + 幾行」，行再由行內片段組成。統一成這個形狀，
 * 是因為段落、小標、條列、編號其實都是「幾行文字」——差別只在怎麼呈現，
 * 而那是元件的事。這讓渲染端只需要一個 `v-for`，不必為每一種結構長一套。
 */
export class AnswerBlockVo {
  constructor(
    public readonly kind: AnswerBlockKind,
    /** 這一塊的每一行。段落與小標通常只有一行，條列與編號一行一項。 */
    public readonly lines: readonly (readonly AnswerSegmentVo[])[],
    /**
     * 這一段程式碼是什麼語言，如果助手在圍欄上說了的話。
     *
     * 它只用來**標給人看**，不用來挑著色器：這個操作台的程式碼區塊是 Go 的那一個，
     * 而它只認得 Go。標註因此是那份著色的誠實對照——助手貼一段 JSON 進來時，
     * 顏色是 Go 味的，但標註說得出那其實是 JSON。
     */
    public readonly language: string = '',
  ) {}
}
