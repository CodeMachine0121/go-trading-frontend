<script setup lang="ts">
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：這一頁最重要的那個數字——**現在多少錢**。
//
// 一批 K 線的「現在」，是最後那一根的收盤價。它用整個畫面最大的字，
// 因為使用者掃過來的第一眼就該落在它身上，不必先讀任何標籤；
// 底下跟著一行漲跌，用顏色說方向。這是每一台交易 app 的第一屏
// （Revolut 的 `US$246.40`、Phantom 的 `$71,825` 都是這個量級）。
//
// **漲跌是 domain 算好的**：收盤減開盤、除以開盤，以及紅綠由哪一邊決定，
// 一個字都不在這裡判斷——這裡只負責把它們排出來。
const { latest } = defineProps<{
  /**
   * 最新那一根。
   *
   * **它一定有值**：一根都沒有的時候，決定「整塊不畫」的是上面那一層——
   * 一個價格區不必學會「沒有價格的樣子」，那只會在它身上多一條永遠不走的路。
   */
  latest: KCandleDto
  symbol: string
  /** 那一根是幾點開始的，用哪個時區說。 */
  timeZone: TimeZoneDto
}>()

/** 帶正負號的漲跌，因為「跌」本來就帶著負號，而「漲」要看得出它是正的。 */
const signedPriceChange = computed(() => {
  const sign = latest.priceChange.isNegative() ? '' : '+'

  return `${sign}${latest.priceChange.toString()}`
})

const signedPercent = computed(() => {
  if (latest.priceChangePercent === null) {
    return null
  }

  const sign = latest.priceChangePercent.isNegative() ? '' : '+'

  return `${sign}${latest.priceChangePercent.toFixed(2)}%`
})
</script>

<template>
  <div
    class="k-candle-quote"
    data-testid="k-candle-quote"
  >
    <span class="k-candle-quote__symbol">{{ symbol }}</span>

    <p class="k-candle-quote__price">
      {{ latest.close.toString() }}
    </p>

    <p
      class="k-candle-quote__change"
      :class="`k-candle-quote__change--${latest.trend.tone}`"
      data-testid="k-candle-quote-change"
    >
      <span>{{ signedPriceChange }}</span>
      <!-- 除不出來的時候不說百分比，而不是說一個看起來很篤定的 0.00% -->
      <span v-if="signedPercent !== null">{{ signedPercent }}</span>
      <span class="k-candle-quote__at">{{ timeZone.formatDateTime(latest.openTime) }}</span>
    </p>
  </div>
</template>

<style scoped lang="scss">
.k-candle-quote {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  padding: spacing('2xs') 0 spacing('xs');
}

.k-candle-quote__symbol {
  @include dense-label;
}

// 這是整個畫面上最大的字。等寬數字讓它在每一次更新時不會左右跳動——
// 一個每分鐘都在變的數字，寬度也跟著變的話，眼睛會一直被拉走。
.k-candle-quote__price {
  margin: 0;
  color: color('text-strong');
  font-weight: font-weight('semibold');
  font-size: font-size('2xl');
  line-height: line-height('tight');

  @include numeric;

  @include respond-to('md') {
    font-size: font-size('3xl');
  }
}

.k-candle-quote__change {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('2xs');
  align-items: baseline;
  margin: 0;
  font-size: font-size('sm');

  @include numeric;

  &--success {
    color: color('success');
  }

  &--danger {
    color: color('danger');
  }

  &--neutral {
    color: color('text-muted');
  }
}

// 時間不是漲跌的一部分，所以它不跟著紅綠走——它只是在說這個數字有多新。
.k-candle-quote__at {
  color: color('text-faint');
  font-size: font-size('2xs');
}
</style>
