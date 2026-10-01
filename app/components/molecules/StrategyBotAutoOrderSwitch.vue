<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppSwitch from '~/components/atoms/AppSwitch.vue'
import type { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const { enabled, switching = false, refusal = null, failureMessage = null } = defineProps<{
  enabled: boolean
  switching?: boolean
  refusal?: AutoOrderRefusalDto | null
  failureMessage?: LocalizedTextVo | null
}>()

const emit = defineEmits<{
  switch: [enabled: boolean]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <div
    class="strategy-bot-auto-order-switch"
    data-testid="auto-order"
  >
    <div class="strategy-bot-auto-order-switch__control">
      <span class="strategy-bot-auto-order-switch__label">{{ t('strategyBot.common.autoOrder') }}</span>
      <AppSwitch
        :model-value="enabled"
        :disabled="switching"
        :label="t('strategyBot.common.autoOrder')"
        data-testid="auto-order-switch"
        @update:model-value="emit('switch', $event)"
      >
        <template #off>
          {{ t('strategyBot.autoOrderSwitch.off') }}
        </template>
        <template #on>
          {{ t('strategyBot.autoOrderSwitch.on') }}
        </template>
      </AppSwitch>
    </div>

    <p
      class="strategy-bot-auto-order-switch__notice"
      data-testid="auto-order-not-in-effect"
    >
      {{ t('strategyBot.autoOrderSwitch.notInEffect') }}
    </p>

    <AppAlert
      v-if="refusal !== null"
      tone="warning"
      data-testid="auto-order-refusal"
    >
      {{ localize(refusal.message) }}
      <template
        v-if="refusal.offersBinanceTradingKeySettings"
        #action
      >
        <NuxtLink
          to="/settings#settings-binance-trading-key"
          data-testid="auto-order-settings-link"
        >
          {{ t('strategyBot.common.goToSettings') }}
        </NuxtLink>
      </template>
    </AppAlert>

    <AppAlert
      v-if="failureMessage !== null"
      tone="danger"
      data-testid="auto-order-failure"
    >
      {{ localize(failureMessage) }}
    </AppAlert>
  </div>
</template>

<style scoped lang="scss">
.strategy-bot-auto-order-switch {
  display: flex;
  flex-direction: column;
  gap: spacing('2xs');

  &__control {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
  }

  &__label {
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }
}
</style>
