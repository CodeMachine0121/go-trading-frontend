<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { ContractTradeBadgeTone } from '~/domain/models/vo/contract-trade-badge-tone-vo'

defineProps<{
  label: string
  tone: ContractTradeBadgeTone
}>()
</script>

<template>
  <AppBadge :variant="tone">
    {{ label }}
  </AppBadge>
</template>
