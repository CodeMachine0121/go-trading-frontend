<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { KCandleContractSearchResultDto } from '~/domain/models/dto/k-candle-contract-search-result-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：把一次合約 K 線查詢的結果攤成表格。
// 筆數、排序、漲跌語氣都已經在 DTO 裡算好，這裡只負責呈現。
//
// 它與現貨那張表（KCandleTable）是兩張表，因為欄位不同：合約每一項成交數字都報，
// 另外多出成交筆數與三條線。三條線各只列收盤——那是讀一根合約 K 線時
// 第一眼要對照的數字；完整的開高低收在圖上看。
defineProps<{
  result?: KCandleContractSearchResultDto | null
  timeZone: TimeZoneDto
}>()

/**
 * 那一條線這一根沒有時，那一格畫的東西。
 *
 * 刻意不是 `0`：溢價指數本來就常在零附近，一個 `0` 會被讀成「這一分鐘沒有溢價」。
 */
const ABSENT_FIGURE = '—'
</script>

<template>
  <AppPanel
    title="查詢結果"
    flush
    class="k-candle-contract-table"
  >
    <template
      v-if="result"
      #meta
    >
      <span data-testid="result-count">共 {{ result.count }} 根</span>
    </template>

    <p
      v-if="!result"
      class="k-candle-contract-table__placeholder"
      data-testid="idle-result"
    >
      填好上面的條件按「查詢」，查到的合約 K 線會列在這裡。
    </p>

    <p
      v-else-if="result.isEmpty"
      class="k-candle-contract-table__placeholder"
      data-testid="empty-result"
    >
      查無 K 線。這段區間內可能還沒有資料，或這個合約還沒開始同步。
    </p>

    <div
      v-else
      class="k-candle-contract-table__scroller"
    >
      <table class="k-candle-contract-table__table">
        <thead>
          <tr>
            <th scope="col">
              起始時間（{{ timeZone.cityLabel }}）
            </th>
            <th scope="col">
              漲跌
            </th>
            <th scope="col">
              開盤價
            </th>
            <th scope="col">
              最高價
            </th>
            <th scope="col">
              最低價
            </th>
            <th scope="col">
              收盤價
            </th>
            <th scope="col">
              成交量
            </th>
            <th scope="col">
              成交筆數
            </th>
            <th scope="col">
              標記價格收盤
            </th>
            <th scope="col">
              指數價格收盤
            </th>
            <th scope="col">
              溢價指數收盤
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="kCandleContract in result.kCandleContracts"
            :key="kCandleContract.openTime.toISOString()"
            data-testid="k-candle-contract-row"
          >
            <td class="k-candle-contract-table__time">
              {{ timeZone.formatDateTime(kCandleContract.openTime) }}
            </td>
            <td>
              <AppBadge :variant="kCandleContract.trend.tone">
                {{ kCandleContract.trend.label }}
              </AppBadge>
            </td>
            <td>{{ kCandleContract.open.toString() }}</td>
            <td>{{ kCandleContract.high.toString() }}</td>
            <td>{{ kCandleContract.low.toString() }}</td>
            <td>{{ kCandleContract.close.toString() }}</td>
            <td>{{ kCandleContract.volume.toString() }}</td>
            <td data-testid="trade-count">
              {{ kCandleContract.tradeCount }}
            </td>
            <td data-testid="mark-price-close">
              {{ kCandleContract.markPriceLine.close.toString() }}
            </td>
            <!-- 舊合約 K 線沒有這兩條：畫成破折號並淡化，與一個真的 0 一眼分得開。 -->
            <td
              :class="{ 'k-candle-contract-table__absent': kCandleContract.indexPriceLine === null }"
              data-testid="index-price-close"
            >
              {{ kCandleContract.indexPriceLine?.close.toString() ?? ABSENT_FIGURE }}
            </td>
            <td
              :class="{ 'k-candle-contract-table__absent': kCandleContract.premiumIndexLine === null }"
              data-testid="premium-index-close"
            >
              {{ kCandleContract.premiumIndexLine?.close.toString() ?? ABSENT_FIGURE }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.k-candle-contract-table {
  flex: 1;
  min-height: 18rem;

  &__absent {
    color: color('text-faint');
  }

  &__placeholder {
    margin: auto;
    padding: spacing('2xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }

  &__scroller {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  &__table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: font-size('xs');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('2xs') spacing('sm');
      text-align: right;
      white-space: nowrap;
    }

    td {
      color: color('text-strong');

      @include numeric;
    }

    // 時間是每一列的身分，釘在左邊不跟著捲——理由與現貨那張表相同。
    th:first-child,
    td:first-child {
      position: sticky;
      left: 0;
      background-color: color('surface');
      text-align: left;
    }

    th:first-child {
      z-index: 1;
      background-color: color('surface-muted');
    }

    tbody tr:hover td:first-child {
      background-color: color('surface-muted');
    }

    th {
      position: sticky;
      top: 0;
      background-color: color('surface-muted');

      @include dense-label;
    }

    tbody tr:hover td {
      background-color: color('surface-muted');
    }

    td.k-candle-contract-table__time {
      color: color('text-muted');
    }
  }
}
</style>
