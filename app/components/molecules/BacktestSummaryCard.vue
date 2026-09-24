<script setup lang="ts">
import type { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：成績單那幾個數字。
//
// 它一個都不算、一個都不進位、也不判斷正負——收到的 DTO 已經全部決定好了。
// 賺綠賠紅尤其如此：那是「這個數字是好消息嗎」，而那是領域知識，不是樣式。
//
// 合約重演多出的那一段有才出現：現貨的成績單一格都不多。
// 分級的確認時間要照使用者選的時區寫，所以時區由外面給。
const { summary, timeZone = null } = defineProps<{
  summary: BacktestSummaryDto
  timeZone?: TimeZoneDto | null
}>()
</script>

<template>
  <dl class="backtest-summary-card">
    <div class="backtest-summary-card__item">
      <dt>一開始有多少錢</dt>
      <dd data-testid="summary-initial-capital">
        {{ summary.initialCapital }}
      </dd>
    </div>
    <div class="backtest-summary-card__item">
      <dt>最後剩多少</dt>
      <dd data-testid="summary-final-equity">
        {{ summary.finalEquity }}
      </dd>
    </div>
    <div class="backtest-summary-card__item">
      <dt>總報酬率</dt>
      <!-- 這一格是整張成績單的第一眼：賺是綠的、賠是紅的，
           掃過去不必先讀數字再判斷正負。 -->
      <dd
        :class="`backtest-summary-card__value--${summary.totalReturnTone}`"
        data-testid="summary-total-return-rate"
      >
        {{ summary.totalReturnRate }}
      </dd>
    </div>
    <div class="backtest-summary-card__item">
      <dt>最大回撤</dt>
      <!-- 回撤永遠是壞消息，所以它不上色——標成紅的只是把它是什麼再說一次。 -->
      <dd data-testid="summary-maximum-drawdown">
        {{ summary.maximumDrawdown }}
      </dd>
    </div>
    <div class="backtest-summary-card__item">
      <dt>勝率</dt>
      <dd data-testid="summary-win-rate">
        {{ summary.winRate }}
      </dd>
    </div>
    <!--
      開倉次數與交易次數並排，而且兩個都一律顯示。
      它們不相等時那個差就是「現在還抱著一注」——而那是一張空交易明細
      唯一說得通的另一種原因。少了左邊這一格，那件事在畫面上完全看不出來。
    -->
    <div class="backtest-summary-card__item">
      <dt>開倉次數</dt>
      <dd data-testid="summary-position-open-count">
        {{ summary.positionOpenCount }}
      </dd>
    </div>
    <div class="backtest-summary-card__item">
      <dt>交易次數</dt>
      <dd data-testid="summary-trade-count">
        {{ summary.tradeCount }}
      </dd>
    </div>
    <!--
      打架過才出現。零的時候多一格永遠是零的數字，只會讓人以為它有什麼意思——
      而重演一支策略腳本時它永遠是零。
      出現的時候它要被看見：一份一直在打架的交易策略幾乎不交易，
      而那張漂亮的成績單會被讀成「很穩」。
    -->
    <div
      v-if="summary.conflictedCandleCount > 0"
      class="backtest-summary-card__item backtest-summary-card__item--warning"
    >
      <dt>規則打架的棒數</dt>
      <dd data-testid="summary-conflicted-candle-count">
        {{ summary.conflictedCandleCount }}
      </dd>
    </div>
    <!--
      被掃出場過才出現，與打架棒數同一條規則——
      沒模擬出場的那一次兩個零沒有任何資訊。
      出現的時候它們要被看見：**同一個報酬率，兩個完全不同的故事**——
      十次出場八次靡停損的策略，與十次都靡訊號的，報酬率可以一模一樣。
    -->
    <div
      v-if="summary.stopLossExitCount > 0"
      class="backtest-summary-card__item"
    >
      <dt>止損出場</dt>
      <dd data-testid="summary-stop-loss-exit-count">
        {{ summary.stopLossExitCount }}
      </dd>
    </div>
    <div
      v-if="summary.takeProfitExitCount > 0"
      class="backtest-summary-card__item"
    >
      <dt>止盈出場</dt>
      <dd data-testid="summary-take-profit-exit-count">
        {{ summary.takeProfitExitCount }}
      </dd>
    </div>
    <!--
      收過錢才出現，與上面那幾格同一條規則。判斷讀的是 `null` 而不是零，
      因為到了這裡它已經是一個字串——而「有沒有收過錢」是領域知識，
      所以那個判斷留在領域模型裡，這裡只問它給了沒有。

      出現的時候它要被看見：**同一個報酬率，兩個完全不同的故事**——
      一支讀不準行情的策略，與一支讀得夠準卻把賺的全交給券商的策略。
    -->
    <div
      v-if="summary.totalTransactionCost !== null"
      class="backtest-summary-card__item"
    >
      <dt>交易成本</dt>
      <dd data-testid="summary-total-transaction-cost">
        {{ summary.totalTransactionCost }}
      </dd>
    </div>
    <div
      v-if="summary.fillTimingLabel"
      class="backtest-summary-card__item"
    >
      <dt>成交時點</dt>
      <dd data-testid="summary-fill-timing">
        {{ summary.fillTimingLabel }}
      </dd>
    </div>
    <!--
      五格一律顯示，不適用就寫不適用：短線策略要回答的正是這五個問題，
      少一格就少一個答案——而「不適用」本身也是答案（例如一筆都沒虧）。
    -->
    <template v-if="summary.tradeStatistics">
      <div class="backtest-summary-card__item">
        <dt>獲利因子</dt>
        <dd data-testid="summary-profit-factor">
          {{ summary.tradeStatistics.profitFactor }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>每筆期望值</dt>
        <dd data-testid="summary-expectancy">
          {{ summary.tradeStatistics.expectancy }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>平均持倉時間</dt>
        <dd data-testid="summary-average-holding-time">
          {{ summary.tradeStatistics.averageHoldingTime }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>最大連續虧損</dt>
        <dd data-testid="summary-maximum-consecutive-loss-count">
          {{ summary.tradeStatistics.maximumConsecutiveLossCount }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>成本佔毛利</dt>
        <dd data-testid="summary-cost-to-gross-profit-ratio">
          {{ summary.tradeStatistics.costToGrossProfitRatio }}
        </dd>
      </div>
      <p
        class="backtest-summary-card__note backtest-summary-card__item--wide"
        data-testid="summary-trade-statistics-note"
      >
        獲利因子、每筆期望值、平均持倉時間、最大連續虧損、成本佔毛利只算已平倉的交易；結束時還開著的那一注不算。
      </p>
    </template>
    <template v-if="summary.contract">
      <div class="backtest-summary-card__item">
        <dt>交易模式</dt>
        <dd data-testid="summary-contract-trading-mode">
          {{ summary.contract.tradingModeLabel }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>槓桿</dt>
        <dd data-testid="summary-contract-leverage">
          {{ summary.contract.leverageLabel }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>強平出場</dt>
        <dd data-testid="summary-liquidation-exit-count">
          {{ summary.contract.liquidationExitCount }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>資金費用</dt>
        <dd
          :class="`backtest-summary-card__value--${summary.contract.totalFundingFeeTone}`"
          data-testid="summary-total-funding-fee"
        >
          {{ summary.contract.totalFundingFee }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>做多（筆／勝率）</dt>
        <dd data-testid="summary-long-trades">
          {{ summary.contract.longTradeCount }}／{{ summary.contract.longWinRate }}
        </dd>
      </div>
      <div class="backtest-summary-card__item">
        <dt>做空（筆／勝率）</dt>
        <dd data-testid="summary-short-trades">
          {{ summary.contract.shortTradeCount }}／{{ summary.contract.shortWinRate }}
        </dd>
      </div>
      <!-- 零也照寫：那正是「交易所讓不讓他下這張單」的答案。 -->
      <div class="backtest-summary-card__item">
        <dt>被交易規則擋下的開倉</dt>
        <dd data-testid="summary-blocked-opening-count">
          {{ summary.contract.blockedOpeningCount }}
        </dd>
      </div>
      <div class="backtest-summary-card__item backtest-summary-card__item--wide">
        <dt>維持保證金依據</dt>
        <dd data-testid="summary-maintenance-margin-basis">
          {{ summary.contract.maintenanceMarginBasisLabel }}
          <span
            v-if="summary.contract.maintenanceMarginConfirmedAt && timeZone"
            data-testid="summary-maintenance-margin-confirmed-at"
          >（確認於 {{ timeZone.formatDateTime(summary.contract.maintenanceMarginConfirmedAt) }}）</span>
        </dd>
        <p
          class="backtest-summary-card__note"
          data-testid="summary-maintenance-margin-basis-note"
        >
          {{ summary.contract.maintenanceMarginBasisNote }}
        </p>
      </div>
    </template>
  </dl>
</template>

<style scoped lang="scss">
.backtest-summary-card {
  display: grid;

  // 每一格自動排開：寬的時候一排、窄的時候折成兩排三排，
  // 而不是固定欄數然後在筆電上把數字擠成兩行。
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: spacing('sm');
  margin: 0;

  &__item {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  // 依據那一格帶一句說明，擠在一個數字那麼寬的格子裡會被摺成一疊。
  &__item--wide {
    grid-column: 1 / -1;
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__item--warning {
    // 打架過的那一格要被看見：它解釋了上面那幾個數字為什麼好看。
    border-color: color('border-strong');

    dt {
      color: color('text');
    }
  }

  dt {
    @include dense-label;
  }

  dd {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('lg');

    // 一個長到超出自己那一格的數字要**換行**，不是溢出去蓋掉隔壁那一欄。
    // 這裡的每一格都是數字，沒有空白可以斷，所以斷在哪裡都行——
    // 比起讀不出來的一行，折成兩行是好的那一種難看。
    //
    // 金額本身已經在 domain 進位過了，正常情況輪不到這一條；
    // 它擋的是「本金填了一兆」那種真的裝不下的時候。
    overflow-wrap: anywhere;

    @include numeric;
  }

  &__value {
    &--positive {
      color: color('success');
    }

    &--negative {
      color: color('danger');
    }

    &--neutral {
      color: color('text-strong');
    }
  }
}
</style>
