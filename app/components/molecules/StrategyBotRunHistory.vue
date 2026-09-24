<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

// 分子：一台機器人跑過的那幾輪，畫成一條由新到舊的時間軸。
//
// 它只在被展開時才有東西可畫，所以取資料是上面的事——一份清單裡十台機器人
// 各自先把自己的歷史撈回來，等於為了一個多數時候沒人展開的區塊打十次後端。
const { runRecords, loading, failureMessage, timeZoneIdentifier, note = null } = defineProps<{
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
  /** 紀錄底下的一句註腳——合約機器人用它說出「一排持有也可能是行情停了」。 */
  note?: string | null
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

    <ol
      v-else
      class="strategy-bot-run-history__rows"
    >
      <li
        v-for="runRecord in runRecords"
        :key="runRecord.runNumber"
        class="strategy-bot-run-history__row"
        :class="[
          `strategy-bot-run-history__row--${runRecord.resultTone}`,
          { 'strategy-bot-run-history__row--needs-attention': runRecord.needsAttention },
        ]"
        data-testid="run-history-row"
      >
        <!-- 軸上的那一點與結果同一個語氣：掃過一整條軸就看得出哪一輪不一樣。 -->
        <span
          class="strategy-bot-run-history__rail"
          aria-hidden="true"
        />

        <div class="strategy-bot-run-history__body">
          <div class="strategy-bot-run-history__headline">
            <span class="strategy-bot-run-history__number">Run {{ runRecord.runNumber }}</span>
            <AppBadge
              :variant="runRecord.resultTone"
              data-testid="run-history-result"
            >
              {{ runRecord.resultLabel }}
            </AppBadge>
            <span class="strategy-bot-run-history__moment">
              {{ formatDateTimeInTimeZone(runRecord.ranAt, timeZoneIdentifier) }}
            </span>
          </div>

          <!--
            那一輪建議過的數字，**只在建議過的時候**。沒有建議是常態
            （沒填部位規劃的機器人、判出持有的那幾輪），而一排寫著「—」的欄位
            會讓這條軸讀起來像壞掉的。
          -->
          <p
            v-if="runRecord.suggestionText !== null"
            class="strategy-bot-run-history__plan"
            data-testid="run-history-plan"
          >
            {{ runRecord.suggestionText }}
          </p>

          <!--
            衝突是這一排裡唯一**要人去處理**的一種，所以它自己說出下一步，
            而且墊一塊警示底：只多一個詞而不說要做什麼的話，讀的人還是得自己想。
          -->
          <p
            v-if="runRecord.needsAttention"
            class="strategy-bot-run-history__attention"
            data-testid="run-history-attention"
          >
            買入與賣出同時成立，在改掉其中一邊之前它不會說話
          </p>
        </div>
      </li>
    </ol>

    <p
      v-if="note !== null && runRecords.length > 0"
      class="strategy-bot-run-history__note"
      data-testid="run-history-note"
    >
      {{ note }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.strategy-bot-run-history {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

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
    margin: 0;
    padding: 0;
    list-style: none;
  }

  // 一輪一格：左邊是軸，右邊是那一輪。軸線畫在格子的左緣，一格接一格就連成一條。
  &__row {
    display: grid;
    grid-template-columns: spacing('md') minmax(0, 1fr);
    gap: spacing('xs');

    &:last-child .strategy-bot-run-history__body {
      border-bottom: none;
    }
  }

  // 軸上的一點，底下拖著一條髮絲線通到下一輪。
  &__rail {
    position: relative;
    display: flex;
    justify-content: center;

    &::before {
      margin-top: spacing('sm');
      border-radius: radius('pill');
      background-color: color('text-faint');
      width: spacing('xs');
      height: spacing('xs');
      content: '';
    }

    &::after {
      position: absolute;
      top: calc(#{spacing('sm')} + #{spacing('xs')});
      bottom: 0;
      left: 50%;
      background-color: color('border');
      width: 1px;
      content: '';
    }
  }

  &__row--success &__rail::before {
    background-color: color('success');
  }

  &__row--danger &__rail::before {
    background-color: color('danger');
  }

  &__row--warning &__rail::before,
  &__row--needs-attention &__rail::before {
    background-color: color('warning');
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    border-bottom: 1px solid color('border');
    padding: spacing('xs') 0;
    min-width: 0;
  }

  &__headline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs') spacing('xs');
  }

  &__number {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');

    @include numeric;
  }

  // 時間推到最右邊：先讀第幾輪、結果是什麼，時間是查的時候才看的。
  &__moment {
    margin-left: auto;
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  // 讀起來是註腳而不是一格資料：它是那一輪的來歷，不是那一輪的結論。
  &__plan {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__attention {
    margin: spacing('3xs') 0 0;
    border-radius: radius('sm');
    background-color: color('warning-soft');
    padding: spacing('2xs') spacing('xs');
    color: color('warning');
    font-size: font-size('xs');
    line-height: line-height('normal');
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }
}
</style>
