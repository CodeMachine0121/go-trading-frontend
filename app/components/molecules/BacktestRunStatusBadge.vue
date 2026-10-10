<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'

// 分子：一筆輪次走到哪，畫成一個標籤；進行中的另寫進度。字與語氣都由 DTO 給。
const { run } = defineProps<{ run: BacktestRunDto }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <AppBadge
    :variant="run.statusTone"
    data-testid="backtest-run-status"
  >
    {{ localize(run.statusLabel) }}<template v-if="run.status === 'running'">
      · {{ t('backtest.runs.progress', { percent: run.progressPercent }) }}
    </template>
  </AppBadge>
</template>
