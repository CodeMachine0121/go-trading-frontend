import Decimal from 'decimal.js'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import { LeverageMultiplierDomain } from '~/domain/models/domains/leverage-multiplier-domain'
import { MaintenanceMarginRateDomain } from '~/domain/models/domains/maintenance-margin-rate-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/** 整個部位。維持保證金率的上限是 `100 ÷ 倍數`，而分子就是這個。 */
const WHOLE_POSITION_PERCENTAGE = new Decimal(100)

/**
 * 什麼都沒填。**這是這張表單的編碼**，不是那個倍數的性質：
 * 回測表單把每一個空的輸入框讀成零（與初始資金以外的每一格同一條規則），
 * 而後端讀零的方式一模一樣。機器人那張表單把空白讀成一倍，所以這一條
 * 留在這裡而不在共用的倍數模型裡——寫進那裡，機器人從此會放過一個真的打了 0 的人。
 */
const NOTHING_TYPED = new Decimal(0)

/** 現貨：拿現金換東西，沒有人借錢給你。 */
const SPOT_TRADING_MODE: TradingMode = 'spot'

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
 * 還有一條**跨組**規則：現貨開不了槓桿。它是一條關於槓桿的規則而不是關於交易模式的規則，
 * 所以住在這裡；交易模式以 `TradingMode | null` 進來，`null` 明寫「這條路問不到模式」。
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
    // 整組沒填。下面每一條都在問「借了這麼多錢之後怎樣」，而這裡一毛都沒借。
    if (this.multiplier.equals(NOTHING_TYPED)) {
      return
    }

    const multiplier = new LeverageMultiplierDomain(this.multiplier, '槓桿倍數')

    const multiplierRejection = multiplier.validationMessage()
    if (multiplierRejection !== null) {
      throw new BacktestFieldError('leverage', multiplierRejection)
    }

    // 沒有借錢就沒有下面那兩條可說：維持保證金率算不出上限也不影響任何結果，
    // 而一個不借錢的現貨重演本來就是這張表單最常見的那一種。
    if (!multiplier.isSet) {
      return
    }

    if (this.tradingMode === SPOT_TRADING_MODE) {
      throw new BacktestFieldError(
        'leverage', '現貨交易模式開不了槓桿——現貨是拿現金換東西，沒有人借錢給你')
    }

    const rateRejection = new MaintenanceMarginRateDomain(
      this.maintenanceMarginRate, '維持保證金率',
      WHOLE_POSITION_PERCENTAGE.dividedBy(this.multiplier)).validationMessage()

    if (rateRejection !== null) {
      throw new BacktestFieldError('leverage', rateRejection)
    }
  }
}
