<script setup lang="ts">
import type { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'

// 分子：成績單那六個數字。
//
// 它一個都不算、一個都不進位、也不判斷正負——收到的 DTO 已經全部決定好了。
// 賺綠賠紅尤其如此：那是「這個數字是好消息嗎」，而那是領域知識，不是樣式。
const { summary } = defineProps<{ summary: BacktestSummaryDto }>()
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
    <div class="backtest-summary-card__item">
      <dt>交易次數</dt>
      <dd data-testid="summary-trade-count">
        {{ summary.tradeCount }}
      </dd>
    </div>
  </dl>
</template>

<style scoped lang="scss">
.backtest-summary-card {
  display: grid;

  // 六格自動排開：寬的時候一排、窄的時候折成兩排三排，
  // 而不是固定六欄然後在筆電上把數字擠成兩行。
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: spacing('sm');
  margin: 0;

  &__item {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  dt {
    @include dense-label;
  }

  dd {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('lg');

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
