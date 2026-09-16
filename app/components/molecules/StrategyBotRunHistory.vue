<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

// 分子：一台機器人跑過的那幾輪。
//
// 它只在被展開時才有東西可畫，所以取資料是上面的事——一份清單裡十台機器人
// 各自先把自己的歷史撈回來，等於為了一個多數時候沒人展開的區塊打十次後端。
const { runRecords, loading, failureMessage, timeZoneIdentifier } = defineProps<{
  runRecords: readonly StrategyBotRunRecordDto[]
  loading: boolean
  failureMessage: string
  /**
   * 拿哪一個時區來說這些時間。
   *
   * 由上面傳下來而不是元件自己去問，是因為整個操作台只有一個顯示時區——
   * 各拿各的，同一頁上就會有兩份說法。
   */
  timeZoneIdentifier: string
}>()
</script>

<template>
  <div class="strategy-bot-run-history">
    <p
      v-if="loading"
      class="strategy-bot-run-history__notice"
    >
      讀取中…
    </p>

    <p
      v-else-if="failureMessage !== ''"
      class="strategy-bot-run-history__notice strategy-bot-run-history__notice--failed"
      data-testid="run-history-failure"
    >
      {{ failureMessage }}
    </p>

    <p
      v-else-if="runRecords.length === 0"
      class="strategy-bot-run-history__notice"
      data-testid="run-history-empty"
    >
      還沒跑過。啟動之後，每一輪的結果都會記在這裡。
    </p>

    <ul
      v-else
      class="strategy-bot-run-history__rows"
    >
      <li
        v-for="runRecord in runRecords"
        :key="runRecord.runNumber"
        class="strategy-bot-run-history__row"
        data-testid="run-history-row"
      >
        <span class="strategy-bot-run-history__number">Run {{ runRecord.runNumber }}</span>
        <span class="strategy-bot-run-history__moment">
          {{ formatDateTimeInTimeZone(runRecord.ranAt, timeZoneIdentifier) }}
        </span>
        <AppBadge
          :variant="runRecord.resultTone"
          data-testid="run-history-result"
        >
          {{ runRecord.resultLabel }}
        </AppBadge>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.strategy-bot-run-history {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');
  padding: spacing('xs');
  border-radius: radius('md');
  background: color('surface');

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');

    &--failed {
      color: color('danger');
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  // 一輪一列，三欄對齊：第幾輪、什麼時候、結果。
  // 對齊才看得出哪一輪跟別的不一樣——那正是打開歷史的人在找的東西。
  &__row {
    display: grid;
    grid-template-columns: 6rem 1fr auto;
    align-items: center;
    gap: spacing('xs');
    padding: spacing('3xs') 0;
  }

  &__number {
    color: color('text-muted');
    font-size: font-size('sm');
    font-variant-numeric: tabular-nums;
  }

  &__moment {
    color: color('text');
    font-size: font-size('sm');
    font-variant-numeric: tabular-nums;
  }
}
</style>
