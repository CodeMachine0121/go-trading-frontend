import { BacktestRuleDto } from '~/domain/models/dto/backtest-rule-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** VO：回測的一條規則。不可變、無行為。 */
export class BacktestRuleVo {
  constructor(
    public readonly title: LocalizedTextVo,
    public readonly description: LocalizedTextVo,
  ) {}

  toDto(): BacktestRuleDto {
    return new BacktestRuleDto(this.title, this.description)
  }
}

/**
 * 回測照什麼規則走——寫給要在算式裡放訊號的人看的那一份。
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
    new LocalizedTextVo('算式要說出這一棒的意見', 'The script must give its view on this candle'),
    new LocalizedTextVo(
      '指標值種類選「一個信號」。算式每一棒回傳一個訊號——'
      + '`return indicator.Buy`、`indicator.Sell` 或 `indicator.Hold`，三選一，沒有第四種。',
      'Set the indicator value type to "A signal". On every candle the script returns one signal — '
      + '`return indicator.Buy`, `indicator.Sell` or `indicator.Hold`: one of the three, there is no fourth.')),
  new BacktestRuleVo(
    new LocalizedTextVo('只跑「一個信號」的算式', 'Only "A signal" scripts can be backtested'),
    new LocalizedTextVo(
      '回測一根 K 線問一次，每一次讀一個訊號。所以指標值種類必須是「一個信號」——'
      + '回傳數字或是非的算式，回測讀不出這一棒的意見。',
      'The backtest asks once per K-candle and reads one signal each time, so the indicator value type must be "A signal" — '
      + 'a script that returns a number or true/false gives the backtest no view on the candle.')),
  new BacktestRuleVo(
    new LocalizedTextVo('一根 K 線跑一次，愈往後看得愈長', 'One run per K-candle, seeing further back as it goes'),
    new LocalizedTextVo(
      '第 N 次執行時，算式看得到第 1 根到第 N 根（含）。它看不到未來，'
      + '就像當時的你也看不到。',
      'On its Nth run the script sees candles 1 through N (inclusive). It cannot see the future, '
      + 'just as you could not have at the time.')),
  new BacktestRuleVo(
    new LocalizedTextVo('成交價一律是那一棒的收盤價', 'Every fill is at that candle\'s close'),
    new LocalizedTextVo(
      '說訊號的那一棒，就是成交的那一棒。你拿計算機就能自己驗一遍。',
      'The candle that gives the signal is the candle that fills. You can check it yourself with a calculator.')),
  new BacktestRuleVo(
    new LocalizedTextVo('重演只做現貨', 'The replay trades spot only'),
    new LocalizedTextVo(
      '買入就開倉，賣出就平倉把錢收回來、之後空手等下一個買點；'
      + '空手時聽到賣出什麼都不做——你沒有東西可以賣，而這裡開不了空倉。'
      + '借錢與做空是合約帳戶的事，那是另外一件事，這裡不做：'
      + '這裡的成績單講的永遠是「拿現金換東西，賣掉就回到現金」。',
      'Buy opens a position; sell closes it and takes the money back, then waits flat for the next buy; '
      + 'a sell signal while flat is ignored — you have nothing to sell, and no short position can be opened here. '
      + 'Borrowing and shorting belong to a contract account, which is a different matter and not done here: '
      + 'the scorecard here always tells the story of "trade cash for something, sell it and you are back to cash".')),
  new BacktestRuleVo(
    new LocalizedTextVo('同一時間只有一個倉位', 'Only one position at a time'),
    new LocalizedTextVo(
      '空手聽到買入就開倉；已經持有又聽到買入，當作沒聽到。'
      + '賣出就平倉，之後空手；空手時聽到賣出什麼都不做。',
      'A buy signal while flat opens a position; a buy signal while already holding is ignored. '
      + 'A sell closes the position and leaves you flat; a sell signal while flat is ignored.')),
  new BacktestRuleVo(
    new LocalizedTextVo('押不下去就跳過，不算失敗', 'A position that cannot be funded is skipped, not a failure'),
    new LocalizedTextVo(
      '押注方式選「固定金額」而當時資金不夠時，這一次開倉不發生，回測照樣走完。',
      'When position sizing is "Fixed amount" and there is not enough capital at the time, that opening does not happen and the backtest runs to the end anyway.')),
  new BacktestRuleVo(
    new LocalizedTextVo('成績單含還開著的那個倉位', 'The scorecard includes the position still open'),
    new LocalizedTextVo(
      '「最後剩多少」把結束時未平倉的部位以最後一棒收盤價估進去；'
      + '但交易明細只列已經平掉的，勝率也只看那些。',
      '"Final equity" values a position still open at the end at the last candle\'s close; '
      + 'but the trade list shows only closed trades, and the win rate counts only those.')),
  new BacktestRuleVo(
    new LocalizedTextVo(
      '出場價位填了才模擬，留白就是一路抱到訊號叫你出場',
      'Exit levels are simulated only when filled in; left blank, you hold until a signal tells you to exit'),
    new LocalizedTextVo(
      '填了止損或止盈距離，回測就真的把它們算進去——'
      + '距離從**進場價**量起：止損永遠在下、止盈永遠在上，因為這裡只有一種倉位。'
      + '留白就完全不模擬，而不是套用一個常見的預設值。'
      + '同一支算式、同一段行情，止損放不放可以是完全不同的兩張成績單。',
      'Fill in a stop-loss or take-profit distance and the backtest really accounts for it — '
      + 'distances are measured from the **entry price**: the stop loss is always below and the take profit always above, because there is only one kind of position here. '
      + 'Left blank, nothing is simulated at all; no common default is applied. '
      + 'Same script, same market data: with or without a stop loss can be two completely different scorecards.')),
  new BacktestRuleVo(
    new LocalizedTextVo('出場價位用那一棒的最高最低價判', 'Exit levels are checked against the candle\'s high and low'),
    new LocalizedTextVo(
      '不是用收盤價——止損是盤中被掃到的，成交在那個價位本身。'
      + '**進場那一棒不判**：成交在它的收盤價，而它的高低點在成交之前就已經發生過了。'
      + '**同一棒同時碰到兩個價位時一律算止損**——'
      + '一根 K 線說不出哪一個先到，而兩種讀法只有這一種永遠不會讓成績單變好看。'
      + '被掃出場之後，那一棒的訊號照常判。',
      'Not against the close — a stop loss is hit intraday and fills at that level itself. '
      + '**The entry candle is not checked**: the fill is at its close, and its high and low happened before the fill. '
      + '**When one candle touches both levels, it always counts as the stop loss** — '
      + 'a K-candle cannot tell which came first, and of the two readings only this one never makes the scorecard look better. '
      + 'After being stopped out, that candle\'s signal is still evaluated as usual.')),
  new BacktestRuleVo(
    new LocalizedTextVo('這一版不算手續費、滑點與槓桿', 'This version does not count fees, slippage or leverage'),
    new LocalizedTextVo(
      '成交是理想成交：說什麼價就是什麼價。所以這裡的數字一定比真實下單好看，'
      + '拿它比較兩支策略腳本的優劣，比拿它預期報酬可靠。',
      'Fills are ideal: whatever price is named is the price you get. So the numbers here always look better than real orders; '
      + 'they are more reliable for comparing two strategy scripts than for predicting returns.')),
  new BacktestRuleVo(
    new LocalizedTextVo('結果不留存', 'Results are not kept'),
    new LocalizedTextVo(
      '算完就在畫面上，重新整理就沒了。回測是探索用的工具，不是紀錄。',
      'Once calculated they are on screen; refresh and they are gone. A backtest is a tool for exploring, not a record.')),
]

/**
 * 合約重演照什麼規則走——合約策略腳本畫面與合約交易策略的回測讀這一份。
 *
 * 與現貨那一份一樣：**這份說明與交易服務的行為必須一起改**。
 */
export const CONTRACT_BACKTEST_RULES: BacktestRuleVo[] = [
  new BacktestRuleVo(
    new LocalizedTextVo('算式要說出這一格的意見', 'The script must give its view on this candle'),
    new LocalizedTextVo(
      '指標值種類選「一個信號」。算式每一格回傳 `indicator.Buy`、`indicator.Sell` 或 `indicator.Hold`，'
      + '看得到的是第 1 格到這一格（含）的合約行情格。',
      'Set the indicator value type to "A signal". On every candle the script returns `indicator.Buy`, `indicator.Sell` or `indicator.Hold`, '
      + 'and it sees the contract market data candles from candle 1 up to this one (inclusive).')),
  new BacktestRuleVo(
    new LocalizedTextVo('逐倉的合約帳戶', 'An isolated-margin contract account'),
    new LocalizedTextVo(
      '每一注押下去的是保證金，承擔的是名目＝保證金 × 槓桿。這一注最多賠光它自己的保證金，'
      + '不會拖累帳上其他的錢。槓桿留白就是一倍。',
      'Each position puts up margin and carries a notional = margin × leverage. A position can lose at most its own margin '
      + 'and never drags down the rest of the account. Leverage left blank means 1x.')),
  new BacktestRuleVo(
    new LocalizedTextVo('交易模式決定買入與賣出的意思', 'The trading mode decides what buy and sell mean'),
    new LocalizedTextVo(
      '多空反手：賣出就反手做空、買入就反手做多；只做多：賣出只平多；只做空：買入只平空。'
      + '反手時先把舊的那一注結清，再用手上的錢開新的那一注——付不起就停在空手。',
      'Long & short: sell reverses into a short, buy reverses into a long; Long only: sell only closes the long; Short only: buy only closes the short. '
      + 'When reversing, the old position is settled first and the new one is opened with the money on hand — if that cannot be afforded, you stay flat.')),
  new BacktestRuleVo(
    new LocalizedTextVo('強平看標記價格', 'Liquidation follows the mark price'),
    new LocalizedTextVo(
      '一格的標記價格碰到強平價，這一注就被強制平倉、保證金全部沒有。'
      + '止損與強平誰離進場價近誰先到；同一格碰到止損與止盈一律算止損。',
      'When a candle\'s mark price reaches the liquidation price, the position is force-closed and all its margin is lost. '
      + 'Between stop loss and liquidation, whichever is closer to the entry price comes first; a candle that touches both stop loss and take profit always counts as the stop loss.')),
  new BacktestRuleVo(
    new LocalizedTextVo('資金費率一律計入', 'Funding is always counted'),
    new LocalizedTextVo(
      '帶著倉位走過的每一次結算都收付：費率為正做多付、做空收，為負反過來。'
      + '資金費用直接進出這一注的保證金，所以強平價會跟著移動。',
      'Every funding settlement passed while holding a position is paid or received: with a positive rate longs pay and shorts receive; with a negative rate it is the other way round. '
      + 'Funding fees go straight into or out of the position\'s margin, so the liquidation price moves with them.')),
  new BacktestRuleVo(
    new LocalizedTextVo('一格裡的順序', 'The order within a candle'),
    new LocalizedTextVo(
      '先收付這一格的資金費率 → 再看止損與強平 → 再看止盈 → 最後才套這一格的信號，成交在收盤價。'
      + '開倉的那一格不判出場價位。',
      'First this candle\'s funding is paid or received → then stop loss and liquidation are checked → then take profit → and only last is this candle\'s signal applied, filling at the close. '
      + 'Exit levels are not checked on the candle a position opens.')),
  new BacktestRuleVo(
    new LocalizedTextVo('交易所不讓下的單，這裡也不下', 'Orders the exchange would refuse are not placed here either'),
    new LocalizedTextVo(
      '數量照數量步進往下取整；低於最小下單量或最小名目、或超過那一級允許的槓桿，這一次開倉就被擋下，'
      + '成績單記一筆「被交易規則擋下」。滑點填了就讓每一次成交往不利的方向偏那麼多。',
      'Quantity is rounded down to the quantity step; below the minimum order quantity or minimum notional, or above the leverage allowed for that tier, the opening is blocked, '
      + 'and the scorecard records one "blocked by trading rules". Fill in slippage and every fill shifts that much in the unfavorable direction.')),
  new BacktestRuleVo(
    new LocalizedTextVo('維持保證金用今天的分級', 'Maintenance margin uses today\'s tiers'),
    new LocalizedTextVo(
      '分級沒有歷史，重演過去用的也是今天那一組；沒有分級時照最小那一級算，大部位的強平價會被算得太遠。',
      'Tiers have no history, so replaying the past uses today\'s set too; with no tiers, the smallest tier is used, and large positions get a liquidation price that is too far away.')),
  new BacktestRuleVo(
    new LocalizedTextVo('結果不留存', 'Results are not kept'),
    new LocalizedTextVo(
      '算完就在畫面上，重新整理就沒了。',
      'Once calculated they are on screen; refresh and they are gone.')),
]
