import Decimal from 'decimal.js'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import { LeverageMultiplierDomain } from '~/domain/models/domains/leverage-multiplier-domain'
import { MaintenanceMarginRateDomain } from '~/domain/models/domains/maintenance-margin-rate-domain'
import { TradingModeDomain } from '~/domain/models/domains/trading-mode-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/** 整個部位。維持保證金率的上限是 `100 ÷ 倍數`，而分子就是這個。 */
const WHOLE_POSITION_PERCENTAGE = new Decimal(100)

/**
 * 還沒有上限可言。沒有借錢就算不出 `100 ÷ 倍數`，而那一格自己的規則
 * （是不是數字、是不是負的）與有沒有借錢無關，仍然要問。
 */
const NO_CEILING = new Decimal(Infinity)

/**
 * 什麼都沒填。**這是這張表單的編碼**，不是那個倍數的性質：
 * 回測表單把每一個空的輸入框讀成零（與初始資金以外的每一格同一條規則），
 * 而後端讀零的方式一模一樣。機器人那張表單把空白讀成一倍，所以這一條
 * 留在這裡而不在共用的倍數模型裡——寫進那裡，機器人從此會放過一個真的打了 0 的人。
 */
const NOTHING_TYPED = new Decimal(0)

/**
 * Domain Model：一次重演要借多少錢，以及撐不住的界線在哪。
 *
 * 形狀與隔壁的出場價位、交易成本一字不差——一組兩格、整組選填、拒絕指向一組
 * （`leverage`），而句子本身說出是哪一格。三組長得一樣是刻意的：
 * 認得其中一組就認得全部三組。
 *
 * **但它有兩件事與那兩組不同，而兩件都不能靠結構暗示，只能寫出來。**
 *
 * 一、**兩格的留白規則不一樣。** 槓桿倍數留白（或填一）＝整組關掉，不模擬強制平倉；
 * 維持保證金率留白只是沒有意見，由後端給 0.5%。那兩組的兩格留白都是「不模擬」。
 *
 * 二、**有一條跨格規則**：維持保證金率必須小於 `100 ÷ 倍數`，否則強平距離變成零或負的，
 * 那一注在開倉那一棒就已經撐不住。那兩組沒有任何跨格規則。
 *
 * 還有一條**跨組**規則：借不到錢的交易模式開不了槓桿。它是一條關於槓桿的規則而不是
 * 關於交易模式的規則，所以住在這裡；交易模式以 `TradingMode | null` 進來，
 * `null` 明寫「這條路問不到模式」。
 *
 * **問的是「借不借得到錢」，不是「是不是現貨」。** 做不了空與借不到錢是兩個各自
 * 獨立的問題，而槓桿做多做不了空卻借得到錢——比對模式名稱會把它歸到現貨那一邊，
 * 而且不會報錯。
 */
export class BacktestLeverageDomain {
  constructor(
    private readonly multiplier: Decimal,
    private readonly maintenanceMarginRate: Decimal,
    /**
     * 這一次照哪一套規矩操作，或 `null`。
     *
     * `null` 不是「沒有交易模式」，是**這條路問不到它**：重演一份交易策略時模式是
     * 那一份自己記著的，這張表單看不到。那一條因此交給後端回答，而它回來的拒絕
     * 會標在同一組旁邊。寫成 `null` 而不是選填參數，是為了讓「問不到」是一個
     * 說出口的決定，而不是一個忘了傳的參數。
     */
    private readonly tradingMode: TradingMode | null,
  ) {}

  /**
   * 講不通就丟一個指著這一組的哨兵錯誤。
   *
   * 形狀與出場價位、交易成本那兩個一字不差，所以兩個請求模型對它的用法與對那兩個相同。
   *
   * 一次只說一個理由，與這張表單其餘每一條同一個理由：使用者一次只改得動一格。
   */
  validate(): void {
    // **那一格自己的規則先問，在任何人決定它會不會被用到之前**，而且不帶上限——
    // 上限要有倍數才算得出來。負的維持保證金率是一個打錯的字，不管這一次有沒有
    // 用到它，這與後端讀的順序一字不差：兩邊對同一份輸入必須給出同一個答案，
    // 否則使用者會在畫面上通過、在伺服器上被拒絕，而那兩件事他分不出差別。
    const declaredRateRejection = new MaintenanceMarginRateDomain(
      this.maintenanceMarginRate, '維持保證金率', NO_CEILING).validationMessage()

    if (declaredRateRejection !== null) {
      throw new BacktestFieldError('leverage', declaredRateRejection)
    }

    // 整組沒填。下面每一條都在問「借了這麼多錢之後怎樣」，而這裡一毛都沒借。
    if (this.multiplier.equals(NOTHING_TYPED)) {
      return
    }

    const multiplier = new LeverageMultiplierDomain(this.multiplier, '槓桿倍數')

    const multiplierRejection = multiplier.validationMessage()
    if (multiplierRejection !== null) {
      throw new BacktestFieldError('leverage', multiplierRejection)
    }

    // 沒有借錢就沒有下面那一條可說：維持保證金率算不出上限，也不影響任何結果，
    // 而一個不借錢的現貨重演本來就是這張表單最常見的那一種。
    if (!multiplier.isSet) {
      return
    }

    if (this.tradingMode !== null
      && !new TradingModeDomain(this.tradingMode).canUseLeverage()) {
      throw new BacktestFieldError(
        'leverage', '現貨交易模式開不了槓桿——現貨是拿現金換東西，沒有人借錢給你')
    }

    // 現在才算得出上限，所以現在才問第二次。那一格是問兩次而不是一次，
    // 因為它有兩種規則：一種是它自己的（是不是數字、是不是負的），
    // 另一種要有倍數才成立。
    const ceilingRejection = new MaintenanceMarginRateDomain(
      this.maintenanceMarginRate, '維持保證金率',
      WHOLE_POSITION_PERCENTAGE.dividedBy(this.multiplier)).validationMessage()

    if (ceilingRejection !== null) {
      throw new BacktestFieldError('leverage', ceilingRejection)
    }
  }
}
