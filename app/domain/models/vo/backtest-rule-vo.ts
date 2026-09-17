import { BacktestRuleDto } from '~/domain/models/dto/backtest-rule-dto'

/** VO：回測的一條規則。不可變、無行為。 */
export class BacktestRuleVo {
  constructor(
    public readonly title: string,
    public readonly description: string,
  ) {}

  toDto(): BacktestRuleDto {
    return new BacktestRuleDto(this.title, this.description)
  }
}

/**
 * 回測照什麼規則走——寫給要在算式裡放信號的人看的那一份。
 *
 * 順序照使用者遇到它們的先後：先是「我的算式要怎麼寫」，再是「按下去之後會發生什麼」，
 * 最後是「哪些事它不做」。最後那一段最容易被跳過，卻是最會讓人誤會的一段：
 * 沒有手續費的成績單一定比真的好看。
 *
 * **這份說明與真正的行為必須一起改。** 它是一段沒有人指著的散文，
 * 而它就掛在表單旁邊一顆鍵後面——說謊的說明比沒有說明更糟，因為讀的人會照著它做決定。
 * 交易模式那一條有測試釘著，就是因為它曾經在這裡說反了。
 */
export const BACKTEST_RULES: BacktestRuleVo[] = [
  new BacktestRuleVo(
    '算式要說出這一棒的意見',
    '指標值種類選「一個信號」。算式每一棒回傳一個信號——'
    + '`return indicator.Buy`、`indicator.Sell` 或 `indicator.Hold`，三選一，沒有第四種。'),
  new BacktestRuleVo(
    '只跑「一個信號」的算式',
    '回測一根 K 線問一次，每一次讀一個信號。所以指標值種類必須是「一個信號」——'
    + '回傳數字或是非的算式，回測讀不出這一棒的意見。'),
  new BacktestRuleVo(
    '一根 K 線跑一次，愈往後看得愈長',
    '第 N 次執行時，算式看得到第 1 根到第 N 根（含）。它看不到未來，'
    + '就像當時的你也看不到。'),
  new BacktestRuleVo(
    '成交價一律是那一棒的收盤價',
    '說信號的那一棒，就是成交的那一棒。你拿計算機就能自己驗一遍。'),
  new BacktestRuleVo(
    '交易模式決定「賣出」是什麼意思',
    '多空反手（預設）永遠在市場裡：賣出把多倉平掉，並在同一棒反手開空；空手時賣出直接開空。'
    + '現貨只做多：賣出就平倉把錢收回來、之後空手等下一個買點；空手時賣出什麼都不做，'
    + '永遠不開空。帳戶不能放空（台股現貨、ETF、多數券商帳戶）就選現貨。'),
  new BacktestRuleVo(
    '同一時間只有一個倉位',
    '空手聽到買入就開多倉；已經是多倉又聽到買入，當作沒聽到。'
    + '聽到賣出會發生什麼，由上面那條交易模式決定——兩種模式在這裡正好分岔。'),
  new BacktestRuleVo(
    '押不下去就跳過，不算失敗',
    '押注方式選「固定金額」而當時資金不夠時，這一次開倉不發生，重演照樣走完。'),
  new BacktestRuleVo(
    '成績單含還開著的那個倉位',
    '「最後剩多少」把結束時未平倉的部位以最後一棒收盤價估進去；'
    + '但交易明細只列已經平掉的，勝率也只看那些。'),
  new BacktestRuleVo(
    '這一版不算手續費、滑點、止損與槓桿',
    '成交是理想成交：說什麼價就是什麼價。所以這裡的數字一定比真實下單好看，'
    + '拿它比較兩支策略腳本的優劣，比拿它預期報酬可靠。'),
  new BacktestRuleVo(
    '結果不留存',
    '算完就在畫面上，重新整理就沒了。回測是探索用的工具，不是紀錄。'),
]
