<script setup lang="ts">
import AppModal from '~/components/atoms/AppModal.vue'
import type { BacktestRuleDto } from '~/domain/models/dto/backtest-rule-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'

/**
 * 分子：回測照什麼規則走。
 *
 * **它是打開來看的，不是攤在版面上的。** 這幾條規則是「第一次用的時候讀一遍、
 * 之後偶爾回頭確認一下」，常駐在畫面上只會跟真正要看的東西搶寬度——
 * 而使用者九成的時間並不在讀它們。與「算式裡可以用什麼」同一個判斷。
 *
 * 每一個字都由 Application 給：它們描述的是系統真正的行為，
 * 寫在這裡的話，行為改了沒有人會知道要回頭改它們。
 */
defineProps<{
  open: boolean
  signalIndicatorName: string
  signalReadings: readonly SignalReadingDto[]
  rules: readonly BacktestRuleDto[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    title="回測照什麼規則走"
    @close="emit('close')"
  >
    <div class="backtest-rule-guide-dialog">
      <section class="backtest-rule-guide-dialog__section">
        <h3 class="backtest-rule-guide-dialog__heading">
          算式怎麼說出這一棒的意見
        </h3>

        <pre class="backtest-rule-guide-dialog__code"><code>return map[string]float64{"{{ signalIndicatorName }}": 1}</code></pre>

        <table class="backtest-rule-guide-dialog__table">
          <thead>
            <tr>
              <th scope="col">
                {{ signalIndicatorName }} 的值
              </th>
              <th scope="col">
                回測讀作
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="reading in signalReadings"
              :key="reading.value"
              data-testid="signal-reading-row"
            >
              <td class="backtest-rule-guide-dialog__value">
                {{ reading.value }}
              </td>
              <td>{{ reading.meaning }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="backtest-rule-guide-dialog__section">
        <h3 class="backtest-rule-guide-dialog__heading">
          按下去之後
        </h3>

        <dl class="backtest-rule-guide-dialog__rules">
          <template
            v-for="rule in rules"
            :key="rule.title"
          >
            <dt data-testid="backtest-rule-title">
              {{ rule.title }}
            </dt>
            <dd>{{ rule.description }}</dd>
          </template>
        </dl>
      </section>
    </div>
  </AppModal>
</template>

<style scoped lang="scss">
.backtest-rule-guide-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  // 一行示範勝過一段描述：它可以直接複製進編輯區。
  &__code {
    margin: 0;
    border-radius: radius('sm');
    background-color: color('surface-raised');
    padding: spacing('xs');
    overflow-x: auto;
    color: color('text');
    font-size: font-size('xs');

    @include numeric;
  }

  &__table {
    border-collapse: collapse;
    width: 100%;
    font-size: font-size('sm');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('2xs') spacing('xs');
      text-align: left;
      vertical-align: top;
    }

    th {
      @include dense-label;
    }

    td {
      color: color('text');
    }
  }

  &__value {
    color: color('text-strong');

    @include numeric;
  }

  &__rules {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;

    dt {
      color: color('text-strong');
      font-weight: font-weight('medium');
      font-size: font-size('sm');
    }

    dd {
      margin: spacing('3xs') 0 0;
      color: color('text-muted');
      font-size: font-size('sm');
      line-height: 1.6;
    }
  }
}
</style>
