<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppSwitch from '~/components/atoms/AppSwitch.vue'
import type { AutoOrderRefusalDto } from '~/domain/models/dto/auto-order-refusal-dto'

const { enabled, switching = false, refusal = null, failureMessage = null } = defineProps<{
  enabled: boolean
  switching?: boolean
  refusal?: AutoOrderRefusalDto | null
  failureMessage?: string | null
}>()

const emit = defineEmits<{
  switch: [enabled: boolean]
}>()
</script>

<template>
  <div
    class="strategy-bot-auto-order-switch"
    data-testid="auto-order"
  >
    <div class="strategy-bot-auto-order-switch__control">
      <span class="strategy-bot-auto-order-switch__label">自動下單</span>
      <AppSwitch
        :model-value="enabled"
        :disabled="switching"
        label="自動下單"
        data-testid="auto-order-switch"
        @update:model-value="emit('switch', $event)"
      >
        <template #off>
          關
        </template>
        <template #on>
          開
        </template>
      </AppSwitch>
    </div>

    <p
      class="strategy-bot-auto-order-switch__notice"
      data-testid="auto-order-not-in-effect"
    >
      尚未生效：目前機器人仍只送 Telegram 通知，不會下單
    </p>

    <AppAlert
      v-if="refusal !== null"
      tone="warning"
      data-testid="auto-order-refusal"
    >
      {{ refusal.message }}
      <template
        v-if="refusal.offersBinanceTradingKeySettings"
        #action
      >
        <NuxtLink
          to="/settings#settings-binance-trading-key"
          data-testid="auto-order-settings-link"
        >
          去設定
        </NuxtLink>
      </template>
    </AppAlert>

    <AppAlert
      v-if="failureMessage !== null"
      tone="danger"
      data-testid="auto-order-failure"
    >
      {{ failureMessage }}
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
