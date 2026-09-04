import { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'

/** VO：一種參數種類在算式裡的讀法。不可變、無行為。 */
export class ScriptParameterAccessVo {
  constructor(
    public readonly kindLabel: string,
    public readonly returnType: string,
    public readonly example: string,
    public readonly usage: string,
  ) {}

  toDto(): ScriptParameterAccessDto {
    return new ScriptParameterAccessDto(
      this.kindLabel, this.returnType, this.example, this.usage)
  }
}

/**
 * 沙箱注入給算式的那兩個函式——宣告好的參數就是這樣讀出來的。
 *
 * **兩種種類讀出來的型別不同，而那正是分兩種的理由。**
 * 回看根數交出 `int`，因為它幾乎總是拿去切片（`data[len(data)-n:]`），
 * 而 Go 不讓浮點數當索引；數值交出 `float64`，因為它要跟價量一起運算。
 * 分成兩個函式而不是一個回傳「某種數字」，等於讓型別替使用者擋掉一次轉型。
 *
 * 名字對不上時**這一次計算會失敗並指名**，而不是安靜地拿到零——
 * 零是一個合法的數字，看起來會像算式寫錯，而錯的其實是名字。
 *
 * 範例刻意寫成**真的會打出來的那兩行**，而不是一個孤零零的函式呼叫：
 * 第二行才是重點——回看根數拿來切片、數值拿去跟價格算，
 * 而「拿來做什麼」正是看到函式簽章之後還會卡住的地方。
 *
 * 後端哪天改了注入的函式名（見 yaegi 那一側的符號表），要改的就是這一份清單。
 */
export const SCRIPT_PARAMETER_ACCESSES: ScriptParameterAccessVo[] = [
  new ScriptParameterAccessVo(
    '回看根數',
    'int',
    [
      'period := indicator.LookbackCount("期數")',
      'window := data[len(data)-period:]',
    ].join('\n'),
    '要往回看幾根。交出整數，可以直接拿去切片；系統也靠它決定要多拿幾根 K 線。',
  ),
  new ScriptParameterAccessVo(
    '數值',
    'float64',
    [
      'factor := indicator.Number("倍數")',
      'upper := data[len(data)-1].Close * (1 + factor)',
    ].join('\n'),
    '倍數、門檻、權重之類的任何一個數字。系統不解讀它的意思，原樣交給算式。',
  ),
]
