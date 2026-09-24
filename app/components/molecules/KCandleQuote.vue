<script setup lang="ts">
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：行情圖表最上面那一條行情摘要——**這一檔、現在多少錢、這一根漲跌多少**。
//
// 一批 K 線的「現在」，是最後那一根的收盤價。它用整個畫面最大的字，
// 因為使用者掃過來的第一眼就該落在它身上，不必先讀任何標籤；
// 旁邊跟著一行漲跌，用顏色說方向。這是每一台交易 app 的第一屏。
//
// **漲跌是 domain 算好的**：收盤減開盤、除以開盤，以及紅綠由哪一邊決定，
// 一個字都不在這裡判斷——這裡只負責把它們排出來。
//
// 其餘的數字（合約的標記價格那幾條）由使用端放進 `stats` 插槽：
// 現貨沒有那幾條，而這一條摘要不必知道自己擺在哪一邊。
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

defineSlots<{
  /** 貼在標的名稱旁邊的小牌子（現貨／永續合約）。 */
  tags?: () => unknown
  /** 價格右邊那一排附帶的數字。 */
  stats?: () => unknown
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

  const rounded = latest.priceChangePercent.toFixed(2)

  // 小數點後兩位之後就看不出方向的漲跌，不要硬掛一個符號上去：
  // 一個寫著 `-0.00%` 的數字讀起來像是壞了。方向仍然說得出來——
  // 旁邊那個金額帶著負號，而整行是紅的。
  if (Number.parseFloat(rounded) === 0) {
    return `${rounded.replace('-', '')}%`
  }

  return `${latest.priceChangePercent.isNegative() ? '' : '+'}${rounded}%`
})
</script>

<template>
  <div
    class="k-candle-quote"
    data-testid="k-candle-quote"
  >
    <span class="k-candle-quote__symbol">
      {{ symbol }}
      <slot name="tags" />
    </span>

    <div class="k-candle-quote__headline">
      <p
        class="k-candle-quote__price"
        :class="`k-candle-quote__price--${latest.trend.tone}`"
      >
        {{ latest.close.toString() }}
      </p>

      <p
        class="k-candle-quote__change"
        :class="`k-candle-quote__change--${latest.trend.tone}`"
        data-testid="k-candle-quote-change"
      >
        <span>{{ signedPriceChange }}</span>
        <!-- 除不出來的時候不說百分比，而不是說一個看起來很篤定的 0.00% -->
        <span v-if="signedPercent !== null">({{ signedPercent }})</span>
        <span class="k-candle-quote__at">{{ timeZone.formatDateTime(latest.openTime) }}</span>
      </p>
    </div>

    <div
      v-if="$slots.stats"
      class="k-candle-quote__stats"
    >
      <slot name="stats" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.k-candle-quote {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');
  padding: spacing('3xs') 0 spacing('xs');

  // 寬螢幕上攤成一條：名稱、價格、其餘數字由左而右，一眼掃過去。
  @include respond-to('md') {
    flex-flow: row wrap;
    gap: spacing('sm') spacing('xl');
    align-items: center;
  }

  &__symbol {
    display: inline-flex;
    gap: spacing('2xs');
    align-items: center;
    color: color('text-strong');
    font-weight: font-weight('bold');
    font-size: font-size('lg');
  }

  // 時間不是漲跌的一部分，所以它不跟著紅綠走——它只是在說這個數字有多新。
  &__at {
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__headline {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  // 這是整個畫面上最大的字。等寬數字讓它在每一次更新時不會左右跳動——
  // 一個每分鐘都在變的數字，寬度也跟著變的話，眼睛會一直被拉走。
  &__price {
    margin: 0;
    font-weight: font-weight('semibold');
    font-size: font-size('3xl');
    line-height: line-height('tight');
    letter-spacing: -0.02em;

    @include numeric;

    @include respond-to('md') {
      font-size: font-size('2xl');
    }

    &--success {
      color: color('success');
    }

    &--danger {
      color: color('danger');
    }

    &--neutral {
      color: color('text-strong');
    }
  }

  &__change {
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

  // 手機上附帶的數字排成三格（一行三個方塊），寬螢幕上則接在價格右邊排成一條。
  &__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: spacing('2xs');

    @include respond-to('md') {
      display: flex;
      flex-wrap: wrap;
      gap: spacing('sm') spacing('xl');
    }
  }
}
</style>
