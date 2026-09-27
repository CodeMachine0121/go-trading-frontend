<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { TradeBadgeTone } from '~/domain/models/vo/trade-badge-tone-vo'

defineProps<{
  label: string
  tone: TradeBadgeTone
}>()
</script>

<template>
  <AppBadge :variant="tone">
    {{ label }}
  </AppBadge>
</template>
