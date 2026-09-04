import type { AnswerSegmentVo } from '~/domain/models/vo/answer-segment-vo'

/**
 * 一則回答被拆解後，一塊是哪一種。
 *
 * 只有五種，而且**認不出來的一律當 `paragraph`**。寧可少認一種結構，
 * 也不為了多認一種而讓內容有機會逃出文字的身分。
 *
 * `preformatted` 收的是「照原樣呈現的那幾行」——助手排的表格與程式碼片段都落在這裡。
 * 這個切片不畫表格：表格在窄欄裡不好讀，而且助手已經被要求直接講結論。
 */
export type AnswerBlockKind = 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'preformatted'

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
  ) {}
}
