<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import type { ContractTradePrefillDto } from '~/domain/models/dto/contract-trade-prefill-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const { prefill, message = null, timeZoneIdentifier } = defineProps<{
  prefill: ContractTradePrefillDto | null
  message?: string | null
  timeZoneIdentifier: string
}>()
</script>

<template>
  <div
    class="contract-trade-prefill-banner"
    data-testid="prefill-banner"
  >
    <p
      v-if="prefill"
      class="contract-trade-prefill-banner__source"
      data-testid="prefill-source"
    >
      {{ prefill.sourceLabel }}・{{ formatDateTimeInTimeZone(prefill.ranAt, timeZoneIdentifier) }} 送出<template v-if="prefill.referencePriceText">
        ・參考價 {{ prefill.referencePriceText }}
      </template>
    </p>
    <AppAlert
      v-if="message"
      tone="info"
      data-testid="prefill-message"
    >
      {{ message }}
    </AppAlert>
  </div>
</template>

<style scoped lang="scss">
.contract-trade-prefill-banner {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__source {
    margin: 0;
    border: 1px solid color('primary');
    border-radius: radius('md');
    background-color: color('primary-soft');
    padding: spacing('xs') spacing('sm');
    color: color('text-strong');
    font-size: font-size('sm');
  }
}
</style>
