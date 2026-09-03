<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：把一次查詢的結果攤成表格。
// 筆數、排序、漲跌語氣都已經在 DTO 裡算好，這裡只負責呈現；
// 時間要用哪一個時區說，問選定的那一個。
//
// 還沒查過（`result` 為 null）時它照樣在：表格區是這個畫面的主體，
// 一片空白比一張「還沒查」的空表格更難懂，而且維護 K 線的入口就掛在它的標題列上——
// 那顆按鈕在第一次查詢之前就要按得到。
defineProps<{
  result?: KCandleSearchResultDto | null
  timeZone: TimeZoneDto
}>()
</script>

<template>
  <AppPanel
    title="查詢結果"
    flush
    class="k-candle-table"
  >
    <template
      v-if="result"
      #meta
    >
      <span data-testid="result-count">共 {{ result.count }} 根</span>
    </template>

    <template
      v-if="$slots.actions"
      #actions
    >
      <slot name="actions" />
    </template>

    <p
      v-if="!result"
      class="k-candle-table__placeholder"
      data-testid="idle-result"
    >
      填好上面的條件按「查詢」，查到的 K 線會列在這裡。
    </p>

    <p
      v-else-if="result.isEmpty"
      class="k-candle-table__placeholder"
      data-testid="empty-result"
    >
      查無 K 線。這段區間內可能還沒有資料，或交易標的名稱與後端不同。
    </p>

    <div
      v-else
      class="k-candle-table__scroller"
    >
      <table class="k-candle-table__table">
        <thead>
          <tr>
            <th scope="col">
              <!-- 標城市名而不是位移：每一列的位移是那一列那個瞬間的，
                   一個「現在的」位移會在日光節約時間前後對不上自己底下的列 -->
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
              成交額
            </th>
            <th scope="col">
              主動買入量
            </th>
            <th scope="col">
              主動買入額
            </th>
            <th
              v-if="$slots['row-actions']"
              scope="col"
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="kCandle in result.kCandles"
            :key="kCandle.openTime.toISOString()"
            data-testid="k-candle-row"
          >
            <td class="k-candle-table__time">
              {{ timeZone.formatDateTime(kCandle.openTime) }}
            </td>
            <td>
              <AppBadge :variant="kCandle.trend.tone">
                {{ kCandle.trend.label }}
              </AppBadge>
            </td>
            <td>{{ kCandle.open.toString() }}</td>
            <td>{{ kCandle.high.toString() }}</td>
            <td>{{ kCandle.low.toString() }}</td>
            <td>{{ kCandle.close.toString() }}</td>
            <td>{{ kCandle.volume.toString() }}</td>
            <td>{{ kCandle.quoteVolume.toString() }}</td>
            <td>{{ kCandle.takerBuyBaseVolume.toString() }}</td>
            <td>{{ kCandle.takerBuyQuoteVolume.toString() }}</td>
            <td v-if="$slots['row-actions']">
              <slot
                name="row-actions"
                :k-candle="kCandle"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.k-candle-table {
  // 表格是這個畫面的主體，剩下的高度全部給它；資料再多也在自己的框裡捲。
  flex: 1;
  min-height: 18rem;

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

    // 一整欄的價量數字要能上下對齊著讀，等寬與定寬數字是為了這件事
    td {
      color: color('text-strong');

      @include numeric;
    }

    th:first-child,
    td:first-child {
      text-align: left;
    }

    th {
      position: sticky;
      top: 0;

      // sticky 的表頭必須自己不透明，否則捲上來的列會從它底下透出來。
      background-color: color('surface-muted');

      @include dense-label;
    }

    tbody tr:hover td {
      background-color: color('surface-muted');
    }

    // 時間是每一列的身分，不是要互相比較的數字——它報到就好，數字才是主角。
    // 這條必須住在 &__table 裡面：上面那條 `td` 的顏色比單一個 class 更明確，
    // 擺在外面的話這行會被它蓋掉，而且不會有任何錯誤提醒你。
    td.k-candle-table__time {
      color: color('text-muted');
    }
  }
}
</style>
