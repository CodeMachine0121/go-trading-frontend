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
        :class="{
          'strategy-bot-run-history__row--needs-attention': runRecord.needsAttention,
        }"
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

        <!--
          那一輪建議過的數字，**只在建議過的時候**。沒有建議是常態
          （沒填部位規劃的機器人、判出持有的那幾輪），而一排寫著「—」的欄位
          會讓這張表讀起來像壞掉的。
        -->
        <span
          v-if="runRecord.suggestedStakeText !== null"
          class="strategy-bot-run-history__plan"
          data-testid="run-history-plan"
        >
          押 {{ runRecord.suggestedStakeText }}
          <template v-if="runRecord.suggestedStopLossText !== null">
            · 止損 {{ runRecord.suggestedStopLossText }}
          </template>
          <template v-if="runRecord.suggestedTakeProfitText !== null">
            · 止盈 {{ runRecord.suggestedTakeProfitText }}
          </template>
        </span>

        <!--
          衝突是這一排裡唯一**要人去處理**的一種，所以它自己說出下一步。
          只多一個詞而不說要做什麼的話，讀的人還是得自己想。
        -->
        <span
          v-if="runRecord.needsAttention"
          class="strategy-bot-run-history__attention"
          data-testid="run-history-attention"
        >
          買入與賣出同時成立，在改掉其中一邊之前它不會說話
        </span>
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

  &__plan {
    // 讀起來是註腳而不是一格資料：它是那一輪的來歷，不是那一輪的結論。
    color: color('text-faint');
    font-size: font-size('2xs');
  }

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

  // 這一列要人去處理。左邊一條線，因為一排紀錄是用掃的——
  // 掃過去時要看得出哪一列不一樣，而不是每一列都讀完。
  &__row--needs-attention {
    border-left: 2px solid color('warning');
    padding-left: spacing('2xs');
  }

  &__attention {
    // 跨過整列，不擠在那三欄裡：它是一句話，不是一個欄位。
    grid-column: 1 / -1;
    color: color('warning');
    font-size: font-size('2xs');
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
