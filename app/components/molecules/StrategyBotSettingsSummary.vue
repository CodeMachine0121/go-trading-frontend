<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'

// 分子：一台機器人怎麼解讀結論、會不會吵擁有者——不打開編輯頁就看得到。
//
// 交易方向只有合約機器人有；那一行由 DTO 帶不帶它決定，這裡不自己比對行情種類。
defineProps<{ strategyBot: StrategyBotDto }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <dl
    class="strategy-bot-settings"
    data-testid="bot-settings"
  >
    <div
      v-if="strategyBot.tradingDirectionsLabel !== null"
      class="strategy-bot-settings__item"
    >
      <dt>{{ t('strategyBot.settingsSummary.tradingDirections') }}</dt>
      <dd data-testid="bot-settings-trading-directions">
        {{ localize(strategyBot.tradingDirectionsLabel) }}
      </dd>
    </div>
    <div
      v-if="strategyBot.notificationsLabel !== null"
      class="strategy-bot-settings__item"
    >
      <dt>{{ t('strategyBot.settingsSummary.notifications') }}</dt>
      <dd data-testid="bot-settings-notifications">
        {{ localize(strategyBot.notificationsLabel) }}
      </dd>
    </div>
  </dl>
</template>

<style scoped lang="scss">
.strategy-bot-settings {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('xs') spacing('md');
  margin: 0;

  &__item {
    display: flex;
    gap: spacing('2xs');
    align-items: baseline;
    font-size: font-size('sm');

    dt {
      color: color('text-faint');
    }

    dd {
      margin: 0;
      color: color('text-strong');
    }
  }
}
</style>
